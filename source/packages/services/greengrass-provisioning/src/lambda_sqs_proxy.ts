/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { logger } from './utils/logger.util';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { DevicesService } from './devices/devices.service';
import { DeviceTaskSummary } from './devices/devices.models';
import { DeploymentsService, GreengrassDeploymentChangeEvent } from './deployments/deployments.service';
import config from 'config';
import { GroupsService } from './groups/groups.service';
import { GroupTasksService } from './groupTasks/groupTasks.service';

// log detected config
logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

let devicesSvc:DevicesService;
let deploymentSvc:DeploymentsService;
let groupsSvc: GroupsService;
let groupTasksSvc: GroupTasksService;
let sqs:AWS.SQS;
let deploymentStatusQueue:string;

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: unknown) => {
  logger.debug(`lambda_sqs_proxy handler: event: ${JSON.stringify(event)}`);

  // lazy init
  if (devicesSvc===undefined) {
    devicesSvc = container.get(TYPES.DevicesService);
  }
  if (groupsSvc===undefined) {
    groupsSvc = container.get(TYPES.GroupsService);
  }
  if (groupTasksSvc===undefined) {
    groupTasksSvc = container.get(TYPES.GroupTasksService);
  }
  if (deploymentSvc===undefined) {
    deploymentSvc = container.get(TYPES.DeploymentsService);
  }
  if (sqs===undefined) {
    const sqsFactory:() => AWS.SQS = container.get(TYPES.SQSFactory);
    sqs = sqsFactory();
  }
  if (deploymentStatusQueue===undefined) {
    deploymentStatusQueue = config.get('aws.sqs.deploymentStatus');
  }

  if (event.Records) {
    for (const r of event.Records) {

      if (r.eventSource === 'aws:sqs') {
        const messageType = r.messageAttributes?.messageType?.stringValue;
        const body = JSON.parse(r.body);

        if (messageType==='DeviceTaskSummary') {
          const taskInfo: DeviceTaskSummary = body;
          if (taskInfo.createdAt) {
            taskInfo.createdAt = new Date(taskInfo.createdAt);
          }
          if (taskInfo.updatedAt) {
            taskInfo.updatedAt = new Date(taskInfo.updatedAt);
          }
          await devicesSvc.associateDevicesWithGroup(taskInfo);

        } else if (messageType==='DeploymentTaskSummary') {
          await deploymentSvc.deploy( body.taskId);

        } else if (messageType==='BulkDeploymentStatus') {
          await deploymentSvc.updateBulkDeploymentStatus( body.taskId);

        } else if (messageType==='GroupTask:Create') {
          await groupTasksSvc.processCreateGroupsTaskBatch(body.taskId,body.groups);

        } else if (messageType==='GroupTask:Update') {
          await groupTasksSvc.processUpdateGroupsTaskBatch(body.taskId,body.groups);

        } else if (body['source']==='aws.greengrass' && body['detail-type']==='Greengrass Deployment Status Change') {
          const d = body['detail'];
          const statusEvent:GreengrassDeploymentChangeEvent = {
            deploymentId: d['deployment-id'],
            deploymentType: d['deployment-type'],
            groupId: d['group-id'],
            status: d['status'],
            approximateFirstReceiveTimestamp: new Date(Number(r.messageAttributes.ApproximateFirstReceiveTimestamp ?? r.attributes.ApproximateFirstReceiveTimestamp))
          };
          try {
            await deploymentSvc.deploymentStatusChange(statusEvent);
          } catch (err) {
            // change the messages visibility timeout so thats its picked up sooner than the default queue visbility for reprocessing
            await sqs.changeMessageVisibility({
              QueueUrl: deploymentStatusQueue,
              ReceiptHandle: r.receiptHandle,
              VisibilityTimeout: 30
            }).promise();
          }

        } else {
          logger.warn(`lambda_sqs_proxy handler: ignoring un-recognized sqs event`);
        }

      } else {
        logger.warn(`lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(r)}`);
        continue;
      }
    }
  }

  logger.debug(`lambda_sqs_proxy handler: exit:`);

};
