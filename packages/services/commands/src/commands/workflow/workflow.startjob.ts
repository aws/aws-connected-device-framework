/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { WorkflowAction } from './workflow.interfaces';
import { TYPES } from '../../di/types';
import { TemplatesService } from '../../templates/templates.service';
import { inject, injectable } from 'inversify';
import { CommandModel } from '../commands.models';
import { logger } from '../../utils/logger';
import AWS = require('aws-sdk');
import ow from 'ow';
import { DevicesService, GroupsService, ASSTLIBRARY_CLIENT_TYPES, SearchService, SearchRequestModel, Device10Resource, Group10Resource } from '@cdf/assetlibrary-client';
import { PROVISIONING_CLIENT_TYPES, ThingsService, BulkProvisionThingsRequest } from '@cdf/provisioning-client';
import config from 'config';
import { CommandsDao } from '../commands.dao';

@injectable()
export class StartJobAction implements WorkflowAction {

    private _iot: AWS.Iot;
    private _s3: AWS.S3;

    constructor(
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao,
        @inject(ASSTLIBRARY_CLIENT_TYPES.DevicesService) private assetLibraryDeviceClient: DevicesService,
        @inject(ASSTLIBRARY_CLIENT_TYPES.GroupsService) private assetLibraryGroupClient: GroupsService,
        @inject(ASSTLIBRARY_CLIENT_TYPES.SearchService) private assetLibrarySearchClient: SearchService,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject('aws.s3.bucket') private s3Bucket: string,
        @inject('aws.s3.prefix') private s3Prefix: string,
        @inject('aws.s3.roleArn') private s3RoleArn: string,
        @inject('aws.jobs.maxTargets') private maxTargets: number,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot ) {
            this._iot = iotFactory();
            this._s3  =  s3Factory();
    }

    async execute(existing:CommandModel, updated:CommandModel): Promise<boolean> {
        logger.debug(`workflow.startjob execute: existing:${JSON.stringify(existing)}, updated:${JSON.stringify(updated)}`);

        // merge the existing with the updated
        const merged = {...existing, ...updated};
        logger.debug(`workflow.startjob execute: merged: ${JSON.stringify(merged)}`);

        // retrieve the template for the command
        const template = await this.templatesService.get(merged.templateId);

        if (template.requiredDocumentParameters !== undefined ) {
            template.requiredDocumentParameters.forEach(key=> {

                // validation: check we have all document parameters required by the template defined for the command
                if (merged.documentParameters===undefined || !merged.documentParameters.hasOwnProperty(key)) {
                    throw new Error(`MISSING_REQUIRED_DOCUMENT_PARAMETER: ${key}`);
                }

                // replace any required document parameters in the job document with the command files
                const token = `\${cdf:parameter:${key}}`;
                template.document = template.document.replace(token, merged.documentParameters[key]);
            });
        }

        // validation: check we have all files required by the template defined for the command
        if (template.requiredFiles !== undefined && template.requiredFiles.length>0 ) {

            for (const key of template.requiredFiles ) {
                const s3Key = `${this.s3Prefix}${merged.commandId}/files/${key}`;
                const s3Params = {
                    Bucket: this.s3Bucket,
                    Key: s3Key
                };

                try {
                    await this._s3.headObject(s3Params).promise();
                } catch (err) {
                    throw new Error(`MISSING_REQUIRED_FILE: ${key}`);
                }

                // replace any required file paths in the job document with pre-signed urls
                const fileToken = `\${cdf:file:${key}}`;
                const presignedUrlToken = `\${aws:iot:s3-presigned-url:https://s3.amazonaws.com/${this.s3Bucket}/${s3Key}}`;
                template.document = template.document.replace(fileToken, presignedUrlToken);
            }
        }

        // augment the template document with additional attributes
        const jsonDoc = JSON.parse(template.document);
        jsonDoc.commandId = merged.commandId;
        jsonDoc.operation = template.operation;
        template.document = JSON.stringify(jsonDoc);

        logger.debug(`workflow.startjob execute: template.document: ${template.document}`);

        // build the target list
        const jobTargets = await this.buildTargetList(merged.commandId, merged.targets, merged.targetQuery);

        // create the AWS IoT job
        const jobId = `cdf-${merged.commandId}`;
        const params: AWS.Iot.CreateJobRequest = {
            jobId,
            targets: jobTargets,
            document: template.document,
            presignedUrlConfig: {
                expiresInSec: template.presignedUrlExpiresInSeconds,
                roleArn: this.s3RoleArn
            },
            targetSelection: merged.type
        };

        if (merged.rolloutMaximumPerMinute!==undefined) {
            params.jobExecutionsRolloutConfig = {
                maximumPerMinute: merged.rolloutMaximumPerMinute
            };
        }

        try {
            await this._iot.createJob(params).promise();
        } catch (err) {
            throw new Error(`AWS IoT job creation failed: ${(<AWS.AWSError>err).message}`);
        }

        updated.jobId=jobId;

        // save the updated job info
        await this.commandsDao.update(updated);

        logger.debug('workflow.startjob execute: exit:true');
        return true;

    }

    public ___testonly___buildTargetList(commandId:string, targets:string[], targetQuery:SearchRequestModel) : Promise<string[]> {
        return this.buildTargetList(commandId, targets, targetQuery);
    }

    private async buildTargetList(commandId:string, targets:string[], targetQuery:SearchRequestModel) : Promise<string[]> {
        logger.debug(`workflow.startjob buildTargetList: commandId:${commandId}, targets:${targets}, targetQuery:${JSON.stringify(targetQuery)}`);

        ow(commandId, ow.string.nonEmpty);
        // ow(targets, ow.array.nonEmpty.minLength(1));

        let awsThingTargets:string[]=[];
        const awsGroupTargets:string[]=[];
        const cdfDeviceTargets:string[]=[];
        const cdfGroupTargets:string[]=[];

        // if we have a target query specified, retrieve all the asset library groups/devices it relates to
        if (targetQuery!==undefined) {
            let searchResults = await this.assetLibrarySearchClient.search(targetQuery);
            logger.verbose(`workflow.startjob buildTargetList: searchResults:${JSON.stringify(searchResults)}`);
            while (searchResults.results.length>0) {
                for(const r of searchResults.results) {
                    if (this.isDevice(r)) {
                        const awsIotThingArn = (r as Device10Resource).awsIotThingArn;
                        if (awsIotThingArn!==undefined) {
                            awsThingTargets.push(awsIotThingArn);
                        }
                    } else {
                        cdfGroupTargets.push((r as Group10Resource).groupPath);
                    }
                }
                // possibly paginated results?
                if (searchResults.pagination!==undefined) {
                    const offset = searchResults.pagination.offset;
                    const count = searchResults.pagination.count;
                    searchResults = await this.assetLibrarySearchClient.search(targetQuery, offset, count );
                } else {
                    searchResults.results=[];
                }
            }
        }

        // figure out the type of each target
        if (targets!==undefined) {
            for(const target of targets) {
                const targetType = this.getTargetType(target);
                switch (targetType) {
                    case TargetType.awsIotThing:
                    awsThingTargets.push(target);
                        break;
                    case TargetType.awsIotGroup:
                    awsGroupTargets.push(target);
                        break;
                    case TargetType.cdfDevice:
                        cdfDeviceTargets.push(target);
                        break;
                    case TargetType.cdfGroup:
                        cdfGroupTargets.push(target);
                        break;
                    default:
                }
            }
        }

        // if we have too many aws iot thing groups as targets, we can't proceed
        const maxGroups = (awsThingTargets.length===0 && cdfDeviceTargets.length===0 && cdfGroupTargets.length===0) ? this.maxTargets : this.maxTargets-1;
        if (awsGroupTargets.length>maxGroups) {
            throw new Error('MAX_GROUPS_EXCEEDED');
        }

        // for CDF groups, we need to get the thing arn of all devices related to the group
        if (cdfGroupTargets.length>0) {
            logger.debug(`workflow.startjob buildTargetList: creating CDFGroupTargets cdfGroupTargets: ${JSON.stringify(cdfGroupTargets)}`);
            for(const groupPath of cdfGroupTargets) {
                let result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath);
                while (true) {
                    if (result.results===undefined) {
                        break;
                    }
                    for(const device of result.results) {
                        if (device.awsIotThingArn) {
                            awsThingTargets.push(device.awsIotThingArn);
                        }
                    }
                    if (result.pagination===undefined) {
                        break;
                    }
                    const offset = result.pagination.offset + result.pagination.count;
                    result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath, null, null, offset, result.pagination.count);
                }
            }
        }

        // for CDF devices, we need to get its corresponding thing arn
        if (cdfDeviceTargets.length>0) {
            logger.debug(`workflow.startjob buildTargetList: creating CDFDeviceTargets, cdfDeviceTargets: ${JSON.stringify(cdfDeviceTargets)}`);
            const result = await this.assetLibraryDeviceClient.getDevicesByID(cdfDeviceTargets, false, [], []);
            for(const device of result.results) {
                if (device.awsIotThingArn) {
                    awsThingTargets.push(device.awsIotThingArn);
                }
            }
        }

        // if the no. devices is greater than the available slots we have, they need flattening into an ephemeral group
        const maxDevices = this.maxTargets - awsGroupTargets.length;
        if (awsThingTargets.length>maxDevices) {
            const ephemeralGroupArn = await this.buildEphemeralGroup(commandId, awsThingTargets);
            awsGroupTargets.push(ephemeralGroupArn);
            awsThingTargets=[];
        }

        // what we have left should be the list of thing and group arns.  one final step, make sure they're unique
        const jobTargets = [...new Set(awsThingTargets.concat(awsGroupTargets))];

        logger.debug(`workflow.startjob buildTargetList: exit:${jobTargets}`);
        return jobTargets;
    }

    public ___testonly___buildEphemeralGroup(commandId:string, awsThingTargets:string[]): Promise<string> {
        return this.buildEphemeralGroup(commandId, awsThingTargets);
    }

    private async buildEphemeralGroup(commandId:string, awsThingTargets:string[]): Promise<string> {
        logger.debug(`workflow.startjob buildEphemeralGroup: commandId:${commandId},  awsThingTargets:${awsThingTargets}`);

        // create the new group
        const thingGroupName = `ephemeral-${commandId}`;
        const thingGroupResponse = await this._iot.createThingGroup({thingGroupName}).promise();

        // add the target things to the group
        const params:BulkProvisionThingsRequest = {
            provisioningTemplateId: config.get('templates.addThingToGroup') as string,
            parameters: awsThingTargets.map(thing=> ({ThingName:thing, ThingGroupName:thingGroupName}))
        };
        let task = await this.thingsService.bulkProvisionThings(params);

        // wait until the task is complete
        while (true) {
            task = await this.thingsService.getBulkProvisionTask(task.taskId);
            if (task.status==='Completed') {
                break;
            } else if (task.status==='Failed' || task.status==='Cancelled' || task.status==='Cancelling') {
                throw new Error ('EPHEMERAL_GROUP_CREATION_FAILURE');
            }
            await new Promise((resolve) => setTimeout(resolve,2500));
        }

        logger.debug(`workflow.startjob buildEphemeralGroup: exit:${thingGroupResponse.thingGroupArn}`);
        return thingGroupResponse.thingGroupArn;
    }

    public ___testonly___getTargetType(target:string): TargetType {
        return this.getTargetType(target);
    }

    private getTargetType(target:string): TargetType {
        // arn:aws:iot:us-east-1:123456789012:thing/MyLightBulb
        if (target.startsWith('arn:aws:iot:')) {
            const elements = target.split(':');
            if (elements[5].startsWith('thing/')) {
                return TargetType.awsIotThing;
            } else if (elements[5].startsWith('thinggroup/')) {
                return TargetType.awsIotGroup;
            }
        } else {
            if (target.startsWith('/')) {
                return TargetType.cdfGroup;
            }
        }
        return TargetType.cdfDevice;
    }

    private isDevice(arg: any): arg is Device10Resource {
        return arg && arg.deviceId && typeof(arg.deviceId) === 'string';
    }

}

export const enum TargetType {
    awsIotThing, awsIotGroup, cdfDevice, cdfGroup
}
