/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger.util';
import { DeploymentsDao } from './deployments.dao';
import ow from 'ow';
import AWS = require('aws-sdk');
import shortid from 'shortid';
import { DeploymentTaskSummary, GreengrassDeploymentType, DeploymentItem, GGBulkDeploymentStatus, GGGroupDeploymentStatus } from './deployments.models';
import { GroupsDao } from '../groups/groups.dao';
import { DevicesDao } from '../devices/devices.dao';

@injectable()
export class DeploymentsService  {

    private gg: AWS.Greengrass;
    private sqs: AWS.SQS;
    private s3: AWS.S3;

    constructor(
        @inject('aws.region') private region: string,
        @inject('aws.greengrass.bulkdeployments.roleArn') private bulkDeploymentExecutionRoleArn: string,
        @inject('aws.s3.bulkdeployments.bucket') private bulkDeploymentsBucket: string,
        @inject('aws.s3.bulkdeployments.prefix') private bulkDeploymentsPrefix: string,
        @inject('aws.sqs.deployments') private deploymentsQueue:string,
        @inject('aws.sqs.bulkDeploymentsStatus') private bulkDeploymentsStatusQueue:string,
        @inject(TYPES.DeploymentsDao) private deploymentsDao: DeploymentsDao,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject(TYPES.DevicesDao) private devicesDao: DevicesDao,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass,
	    @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS) {
            this.gg = greengrassFactory();
            this.s3 = s3Factory();
            this.sqs = sqsFactory();
        }

    public async createDeploymentTask(items: DeploymentItem[]) : Promise<DeploymentTaskSummary> {
        logger.debug(`deployments.service createDeploymentTask: in: items:${JSON.stringify(items)}`);

        // validation
        ow(items, 'Deployments', ow.array.nonEmpty.minLength(1));
        for(const d of items) {
            ow(d.groupName, ow.string.nonEmpty);
        }

        // default data not provided
        items.filter(d=> d.deploymentType===undefined).forEach(d=> d.deploymentType==='NewDeployment');

        // create the task
        const taskId = shortid.generate();
        const taskInfo:DeploymentTaskSummary = {
            taskId,
            taskStatus: 'Waiting',
            createdAt: new Date(),
            updatedAt: new Date(),
            deployments: items.map(d=> {
                return {...d, deploymentStatus:'Waiting'};
            })
        };

        await this.deploymentsDao.saveDeploymentTask(taskInfo);

        await this.sqs.sendMessage({
            QueueUrl: this.deploymentsQueue,
            MessageBody: JSON.stringify({taskId: taskInfo.taskId}),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: DeploymentTaskSummary.name
                }
            }
        }).promise();

        logger.debug(`deployments.service createDeploymentTask: exit: taskInfo:${JSON.stringify(taskInfo)}`);
        return taskInfo;
    }

    public async getDeploymentTask(taskId: string) : Promise<DeploymentTaskSummary> {
        logger.debug(`deployments.service getDeploymentTask: in: taskId:${taskId}`);

        // validation
        ow(taskId, 'Deployment Task Id', ow.string.nonEmpty);

        // hydrate the task
        const task = await this.deploymentsDao.getDeploymentTask(taskId);
        if (task===undefined) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`deployments.service getDeploymentTask: exit: taskInfo:${JSON.stringify(task)}`);
        return task;
    }

    public async deploy(taskId:string) : Promise<boolean> {
        logger.debug(`deployments.service deploy: in: taskId:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        // hydrate the task
        const task = await this.deploymentsDao.getDeploymentTask(taskId);
        if (task===undefined) {
            logger.error(`deployments.service deploy: ignoring ${taskId} as not a known deployment task`);
            return true;
        }

        // make sure we're still ok to proceed ahead with it
        if (task.taskStatus!=='Waiting') {
            logger.warning(`deployments.service deploy: ignoring ${taskId} as tasksStatus:${task.taskStatus}`);
            return true;
        }

        // lock it
        task.taskStatus = 'InProgress';
        await this.deploymentsDao.saveDeploymentTask(task);

        // augment the deployment task with the greengrass info required to perform the deployment
        for(const deployment of task.deployments) {
            if (deployment.groupVersionId===undefined) {
                const groupInfo = await this.groupsDao.get(deployment.groupName);
                if (groupInfo===undefined) {
                    deployment.deploymentStatus = 'Failure';
                    deployment.statusMessage = 'Not a known Greengrass group';
                    logger.warn(`deployments.service deploy: ${deployment.groupName}: ${deployment.statusMessage}`);
                    continue;
                }
                deployment.groupId = groupInfo.id;
                deployment.groupVersionId = groupInfo.versionId;
            }
        }

        // do we have any new deployments to process?
        const newDeployments = task.deployments.filter(d=> d.deploymentType==='NewDeployment' && d.deploymentStatus==='Waiting');
        logger.debug(`deployments.service deploy: newDeployments: ${JSON.stringify(newDeployments)}`);

        // make sure an existing bulk deployment is not running as there's a limit of 1 concurrent task per account
        if (newDeployments.length>0 && await this.isBulkDeploymentsRunning()) {
            task.taskStatus = 'Waiting';
            task.statusMessage = 'Postponed, as existing bulk deploy is running';
            logger.warn(`deployments.service deploy: ${task.taskId}: ${task.taskStatus} : ${task.statusMessage}`);
            await this.deploymentsDao.saveDeploymentTask(task);
            return false;
        }

        const devicesToTrigger:string[] = [];
        if (newDeployments.length>0) {

            // roll out the greengrass group deployments
            const bulkDeploymentId = await this.createBulkDeploymentTask(newDeployments, task);
            task.bulkDeploymentId = bulkDeploymentId;

            for (const d of newDeployments) {
                d.bulkDeploymentId = bulkDeploymentId;
                this.determineDevicesToDeploy(devicesToTrigger, d.groupName);
                d.deploymentStatus='InProgress';
            }
        }

        // process any redeploys
        const redeployments = task.deployments.filter(d=> d.deploymentType==='Redeployment' && d.deploymentStatus==='Waiting');
        logger.debug(`deployments.service deploy: redeployments: ${JSON.stringify(redeployments)}`);
        if (redeployments.length>0) {
            for (const d of redeployments) {
                try {
                    const r = await this.gg.createDeployment({
                        DeploymentType: 'Redeployment',
                        GroupId: d.groupId,
                        AmznClientToken: `${task.taskId}-${d.groupName}`,
                        GroupVersionId: d.groupVersionId,
                        DeploymentId: d.deploymentId
                    }).promise();
                    d.deploymentStatus = 'InProgress';
                    d.deploymentId = r.DeploymentId;
                    this.determineDevicesToDeploy(devicesToTrigger, d.groupName);
                } catch (err) {
                    d.deploymentStatus = 'Failure';
                    d.statusMessage = `${err}`;
                    logger.warn(`deployments.service deploy: redeployment: task:${task.taskId}, group:${d.groupName}, taskStatus:${task.taskStatus} - ${task.statusMessage}`);
                }
            }
        }

        // process any resets
        const resets = task.deployments.filter(d=> (d.deploymentType==='ResetDeployment' || d.deploymentType==='ForceResetDeployment') && d.deploymentStatus==='Waiting');
        logger.debug(`deployments.service deploy: resets: ${JSON.stringify(resets)}`);
        if (resets.length>0) {
            for (const d of resets) {
                try {
                    d.deploymentStatus = 'InProgress';
                    const req:AWS.Greengrass.ResetDeploymentsRequest = {
                        GroupId: d.groupId,
                        AmznClientToken: `${task.taskId}-${d.groupName}`
                    };
                    if (d.deploymentType==='ForceResetDeployment') {
                        req.Force = true;
                    }
                    const r = await this.gg.resetDeployments(req).promise();
                    d.deploymentStatus = 'InProgress';
                    d.deploymentId = r.DeploymentId;
                } catch (err) {
                    d.deploymentStatus = 'Failure';
                    d.statusMessage = `${err}`;
                    logger.warn(`deployments.service deploy: reset: task:${task.taskId}, group:${d.groupName}, taskStatus:${task.taskStatus} - ${task.statusMessage}`);
                }
            }
        }

        // figure out overall status.
        const failedCount = task.deployments.filter(d=> d.deploymentStatus==='Failure').length;
        task.taskStatus = (failedCount>0) ? 'Failure' : 'Success';
        await this.deploymentsDao.saveDeploymentTask(task);

        logger.debug(`deployments.service deploy: exit: true`);
        return true;
    }

    private async determineDevicesToDeploy(devicesToTrigger:string[], groupName:string): Promise<void> {
        // trigger device deployments
        const devices = await this.devicesDao.listDevices(groupName, false);
        if (devices!==undefined) {
            devicesToTrigger.push(...devices.map(device=> device.thingName));
        }
    }

    private async isBulkDeploymentsRunning(): Promise<boolean> {
        const latestBulkDeployment = await this.gg.listBulkDeployments({MaxResults:'1'}).promise();
        const latestBulkDeploymentId = latestBulkDeployment?.BulkDeployments?.[0]?.BulkDeploymentId;
        if (latestBulkDeploymentId) {
            const latestBulkDeploymentDetails = await this.gg.getBulkDeploymentStatus({BulkDeploymentId:latestBulkDeploymentId}).promise();
            const latestBulkDeploymentStatus = latestBulkDeploymentDetails?.BulkDeploymentStatus;
            return (latestBulkDeploymentStatus==='Initializing' || latestBulkDeploymentStatus==='Running' || latestBulkDeploymentStatus==='Stopping');
        }
        return false;
    }

    private async createBulkDeploymentTask(newDeployments: DeploymentItem[], task:DeploymentTaskSummary): Promise<string> {

        // first we prepare the request
        const lines:string[] = [];
        newDeployments.forEach(d=> lines.push(`{"GroupId":"${d.groupId}", "GroupVersionId":"${d.groupVersionId}", "DeploymentType":"NewDeployment"}`));

        const s3Key = `${this.bulkDeploymentsPrefix}${task.taskId}.json`;
        const putObjectRequest = {
            Bucket: this.bulkDeploymentsBucket,
            Key: s3Key,
            Body: lines.join('\n') + '\n'
        };
        await this.s3.putObject(putObjectRequest).promise();
        const s3Uri = `https://${this.bulkDeploymentsBucket}.s3-${this.region}.amazonaws.com/${s3Key}`;

        // then submit it
        const res = await this.gg.startBulkDeployment({
            InputFileUri: s3Uri,
            ExecutionRoleArn: this.bulkDeploymentExecutionRoleArn,
            AmznClientToken: task.taskId
        }).promise();

        // fire a message to start checking the status of the bulk deployment task
        await this.publishBulkDeploymentStatusCheck(task.taskId);

        return res.BulkDeploymentId;
    }

    private async publishBulkDeploymentStatusCheck(taskId:string) : Promise<void> {
        logger.debug(`deployments.service publishBulkDeploymentStatusCheck: in: taskId:${taskId}`);
        await this.sqs.sendMessage({
            QueueUrl: this.bulkDeploymentsStatusQueue,
            MessageBody: JSON.stringify({taskId}),
            MessageAttributes: {
                messageType: {
                    DataType: 'String',
                    StringValue: 'BulkDeploymentStatus'
                }
            },
            DelaySeconds: 5
        }).promise();
        logger.debug(`deployments.service publishBulkDeploymentStatusCheck: exit`);
    }

    public async updateBulkDeploymentStatus(taskId:string) : Promise<void> {
        logger.debug(`deployments.service updateBulkDeploymentStatus: in: taskId:${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        // hydrate the task
        const task = await this.deploymentsDao.getDeploymentTask(taskId, true);
        if (task===undefined) {
            logger.warn(`deployments.service updateBulkDeploymentStatus: ignoring ${taskId} as not a known deployment task`);
            return;
        }

        // do we need to check it?
        if (task.bulkDeploymentId===undefined ) {
            logger.warn(`deployments.service updateBulkDeploymentStatus: ignoring task:${taskId} as no known associated bulk deployment!`);
            return;
        }
        if (task.bulkDeploymentStatus==='Completed' || task.bulkDeploymentStatus==='Failed' || task.bulkDeploymentStatus==='Stopped') {
            logger.warn(`deployments.service updateBulkDeploymentStatus: ignoring task:${taskId} already processed, therefore ignoring`);
            return;
        }

        // if so, retrieve and save its latest status
        const latestStatus = await this.gg.getBulkDeploymentStatus({BulkDeploymentId:task.bulkDeploymentId}).promise();
        logger.debug(`deployments.service updateBulkDeploymentStatus: getBulkDeploymentStatus: ${JSON.stringify(latestStatus)}`);
        task.bulkDeploymentStatus = <GGBulkDeploymentStatus> latestStatus.BulkDeploymentStatus;
        await this.deploymentsDao.saveDeploymentTask(task);

        // if its finished, we need to extract all the individual deploymentIds so that we can track when each
        // individual group is finished.  If not, republish the message so we can check again soon
        if (task.bulkDeploymentStatus==='Completed' || task.bulkDeploymentStatus==='Stopped' || task.bulkDeploymentStatus==='Failed') {

            // first get the detailed report.  may be paginated...
            const awsDetails:AWS.Greengrass.BulkDeploymentResult[]= [];
            let nextToken:string;
            while (true) {
                const detailedReport = await this.gg.listBulkDeploymentDetailedReports({
                    BulkDeploymentId: task.bulkDeploymentId,
                    NextToken: nextToken
                }).promise();
                awsDetails.push(...detailedReport.Deployments);
                nextToken = detailedReport.NextToken;
                if (nextToken===undefined) {
                    break;
                }
            }
            // the detailed report only has a reference to the groupId, therefore fetch their names
            const groupIds = awsDetails.map(d=> d.GroupArn.split('/')[3]);
            const groupNames = await this.groupsDao.getNames(groupIds);
            const deploymentDetails:DeploymentItem[]= awsDetails.map(d=> {
                const groupId = d.GroupArn.split('/')[3];
                const di:DeploymentItem = {
                    groupId,
                    groupName: groupNames[groupId],
                    deploymentId: d.DeploymentId.split(':')[1],
                    deploymentStatus: <GGGroupDeploymentStatus> d.DeploymentStatus,
                    statusMessage: d.ErrorMessage,
                    createdAt: new Date(),
                    deploymentType: <GreengrassDeploymentType> d.DeploymentType
                };
                return di;
            });
            await this.deploymentsDao.saveBulkDeploymentDetails(task.taskId, deploymentDetails);
        } else {
            await this.publishBulkDeploymentStatusCheck(task.taskId);
        }

        logger.debug(`deployments.service updateBulkDeploymentStatus: exit:`);
    }

    public async deploymentStatusChange(event:GreengrassDeploymentChangeEvent) : Promise<void> {
        logger.debug(`deployments.service deploymentStatusChange: in: event:${JSON.stringify(event)}`);

        ow(event, ow.object.nonEmpty);
        ow(event.deploymentId, ow.string.nonEmpty);
        ow(event.deploymentType, ow.string.nonEmpty);
        ow(event.groupId, ow.string.nonEmpty);
        ow(event.status, ow.string.nonEmpty);
        ow(event.approximateFirstReceiveTimestamp, ow.date);

        // see if we have an id map available yet (not available until the bulk deployment task status has been checked)
        const task = await this.deploymentsDao.getDeploymentIdMap(event.deploymentId, event.groupId);

        // if its not available, requeue it
        if (task?.deployments?.length!==1) {
            logger.debug(`deployments.service deploymentStatusChange: rejected as no deploymennt map available yet:`);
            throw new Error('NO_DEPLOYMENT_MAP');
        }

        // check that the group matches what we're expecting
        const d = task.deployments[0];
        if (d.groupId!==event.groupId) {
            logger.warn(`deployments.service deploymentStatusChange: ignoring as expected groupId:${event.groupId} actual:${d.groupId}`);
            return;
        }

        if (event.approximateFirstReceiveTimestamp <= (d.updatedAt  ?? d.createdAt)) {
            logger.warn(`deployments.service deploymentStatusChange: ignoring as old event`);
            return;
        }

        // if we have all the data we need, lets go ahead and save
        d.deploymentStatus = <GGGroupDeploymentStatus> event.status;
        await this.deploymentsDao.saveDeploymentTask(task);

        logger.debug(`deployments.service deploymentStatusChange: exit:`);
    }

}

export interface GreengrassDeploymentChangeEvent {
    groupId: string;
    deploymentId: string;
    deploymentType: string;
    status: string;
    approximateFirstReceiveTimestamp: Date;
}
