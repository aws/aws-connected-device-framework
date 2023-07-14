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
import { inject, injectable } from 'inversify';
import ow from 'ow';

import {
    ASSETLIBRARY_CLIENT_TYPES,
    Device10Resource,
    DevicesService,
    Group10Resource,
    GroupsService,
    SearchRequestModel,
    SearchService,
} from '@awssolutions/cdf-assetlibrary-client';
import {
    BulkProvisionThingsRequest,
    PROVISIONING_CLIENT_TYPES,
    ThingsService,
} from '@awssolutions/cdf-provisioning-client';

import { TYPES } from '../../di/types';
import { TemplateModel } from '../../templates/templates.models';
import { TemplatesService } from '../../templates/templates.service';
import { logger } from '../../utils/logger';
import { CommandsDao } from '../commands.dao';
import { CommandModel } from '../commands.models';
import { CommandsValidator } from '../commands.validator';
import { WorkflowAction } from './workflow.interfaces';

import AWS = require('aws-sdk');
@injectable()
export class StartJobAction implements WorkflowAction {
    private _iot: AWS.Iot;
    private _s3: AWS.S3;

    constructor(
        @inject(TYPES.CommandsValidator) private commandsValidator: CommandsValidator,
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao,
        @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService)
        private assetLibraryDeviceClient: DevicesService,
        @inject(ASSETLIBRARY_CLIENT_TYPES.GroupsService)
        private assetLibraryGroupClient: GroupsService,
        @inject(ASSETLIBRARY_CLIENT_TYPES.SearchService)
        private assetLibrarySearchClient: SearchService,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject('aws.s3.bucket') private s3Bucket: string,
        @inject('aws.s3.prefix') private s3Prefix: string,
        @inject('aws.s3.roleArn') private s3RoleArn: string,
        @inject('aws.jobs.maxTargets') private maxTargets: number,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    ) {
        this._iot = iotFactory();
        this._s3 = s3Factory();
    }

    async execute(existing: CommandModel, updated: CommandModel): Promise<boolean> {
        logger.debug(
            `workflow.startjob execute: existing:${JSON.stringify(
                existing,
            )}, updated:${JSON.stringify(updated)}`,
        );

        const [merged, template] = await this.buildCommand(existing, updated);

        // validate the merged document
        this.commandsValidator.validate(merged);

        if (template.requiredDocumentParameters !== undefined) {
            for (const key of template.requiredDocumentParameters) {
                // validation: check we have all document parameters required by the template defined for the command
                if (
                    merged.documentParameters === undefined ||
                    !merged.documentParameters.hasOwnProperty(key)
                ) {
                    throw new Error(`MISSING_REQUIRED_DOCUMENT_PARAMETER: ${key}`);
                }
                // replace any required document parameters in the job document with the command files
                const token = `\${cdf:parameter:${key}}`;
                template.document = template.document.replace(
                    token,
                    merged.documentParameters[key],
                );
            }
        }

        // validation: check we have all files required by the template defined for the command
        if (template.requiredFiles !== undefined && template.requiredFiles.length > 0) {
            for (const key of template.requiredFiles) {
                const s3Key = `${this.s3Prefix}${merged.commandId}/files/${key}`;
                const s3Params = {
                    Bucket: this.s3Bucket,
                    Key: s3Key,
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

        // build the target list
        const jobTargets = await this.buildTargetList(
            merged.commandId,
            merged.targets,
            merged.targetQuery,
        );

        // create the AWS IoT job
        const params = this.assembleCreateJobRequest(jobTargets, template, merged);

        try {
            await this._iot.createJob(params).promise();
        } catch (err) {
            throw new Error(`AWS IoT job creation failed: ${(<AWS.AWSError>err).message}`);
        }

        updated.jobId = params.jobId;

        // save the updated job info
        await this.commandsDao.update(updated);

        logger.debug('workflow.startjob execute: exit:true');
        return true;
    }

    public ___testonly___buildTargetList(
        commandId: string,
        targets: string[],
        targetQuery: SearchRequestModel,
    ): Promise<string[]> {
        return this.buildTargetList(commandId, targets, targetQuery);
    }

    private async buildTargetList(
        commandId: string,
        targets: string[],
        targetQuery: SearchRequestModel,
    ): Promise<string[]> {
        logger.debug(
            `workflow.startjob buildTargetList: commandId:${commandId}, targets:${targets}, targetQuery:${JSON.stringify(
                targetQuery,
            )}`,
        );

        ow(commandId, ow.string.nonEmpty);
        // ow(targets, ow.array.nonEmpty.minLength(1));

        let awsThingTargets: string[] = [];
        const awsGroupTargets: string[] = [];
        const cdfDeviceTargets: string[] = [];
        const cdfGroupTargets: string[] = [];

        // if we have a target query specified, retrieve all the asset library groups/devices it relates to
        if (targetQuery !== undefined) {
            let searchResults = await this.assetLibrarySearchClient.search(targetQuery);
            logger.verbose(
                `workflow.startjob buildTargetList: searchResults:${JSON.stringify(
                    searchResults,
                )}`,
            );
            while (searchResults.results.length > 0) {
                for (const r of searchResults.results) {
                    if (this.isDevice(r)) {
                        const awsIotThingArn = (r as Device10Resource).awsIotThingArn;
                        if (awsIotThingArn !== undefined) {
                            awsThingTargets.push(awsIotThingArn);
                        }
                    } else {
                        cdfGroupTargets.push((r as Group10Resource).groupPath);
                    }
                }
                // possibly paginated results?
                if (searchResults.pagination !== undefined) {
                    const offset = searchResults.pagination.offset;
                    const count = searchResults.pagination.count;
                    searchResults = await this.assetLibrarySearchClient.search(
                        targetQuery,
                        offset + count,
                    );
                } else {
                    searchResults.results = [];
                }
            }
        }

        // figure out the type of each target
        if (targets !== undefined) {
            for (const target of targets) {
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
        const maxGroups =
            awsThingTargets.length === 0 &&
            cdfDeviceTargets.length === 0 &&
            cdfGroupTargets.length === 0
                ? this.maxTargets
                : this.maxTargets - 1;
        if (awsGroupTargets.length > maxGroups) {
            throw new Error('MAX_GROUPS_EXCEEDED');
        }

        // for CDF groups, we need to get the thing arn of all devices related to the group
        if (cdfGroupTargets.length > 0) {
            logger.debug(
                `workflow.startjob buildTargetList: creating CDFGroupTargets cdfGroupTargets: ${JSON.stringify(
                    cdfGroupTargets,
                )}`,
            );
            for (const groupPath of cdfGroupTargets) {
                let result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath);
                while (result.results !== undefined) {
                    for (const device of result.results) {
                        if (device.awsIotThingArn) {
                            awsThingTargets.push(device.awsIotThingArn);
                        }
                    }
                    if (result.pagination === undefined) {
                        break;
                    }
                    const offset = result.pagination.offset + result.pagination.count;
                    result = await this.assetLibraryGroupClient.listGroupMembersDevices(
                        groupPath,
                        null,
                        null,
                        offset,
                        result.pagination.count,
                    );
                }
            }
        }

        // for CDF devices, we need to get its corresponding thing arn
        if (cdfDeviceTargets.length > 0) {
            logger.debug(
                `workflow.startjob buildTargetList: creating CDFDeviceTargets, cdfDeviceTargets: ${JSON.stringify(
                    cdfDeviceTargets,
                )}`,
            );
            const result = await this.assetLibraryDeviceClient.getDevicesByID(
                cdfDeviceTargets,
                false,
                [],
                [],
            );
            for (const device of result.results) {
                if (device.awsIotThingArn) {
                    awsThingTargets.push(device.awsIotThingArn);
                }
            }
        }

        // if the no. devices is greater than the available slots we have, they need flattening into an ephemeral group
        const maxDevices = this.maxTargets - awsGroupTargets.length;
        if (awsThingTargets.length > maxDevices) {
            const ephemeralGroupArn = await this.buildEphemeralGroup(commandId, awsThingTargets);
            awsGroupTargets.push(ephemeralGroupArn);
            awsThingTargets = [];
        }

        // what we have left should be the list of thing and group arns.  one final step, make sure they're unique
        const jobTargets = [...new Set(awsThingTargets.concat(awsGroupTargets))];

        logger.debug(`workflow.startjob buildTargetList: exit:${jobTargets}`);
        return jobTargets;
    }

    public ___testonly___buildEphemeralGroup(
        commandId: string,
        awsThingTargets: string[],
    ): Promise<string> {
        return this.buildEphemeralGroup(commandId, awsThingTargets);
    }

    private async buildEphemeralGroup(
        commandId: string,
        awsThingTargets: string[],
    ): Promise<string> {
        logger.debug(
            `workflow.startjob buildEphemeralGroup: commandId:${commandId},  awsThingTargets:${awsThingTargets}`,
        );

        // create the new group
        const thingGroupName = `ephemeral-${commandId}`;
        const thingGroupResponse = await this._iot.createThingGroup({ thingGroupName }).promise();

        // add the target things to the group
        const params: BulkProvisionThingsRequest = {
            provisioningTemplateId: process.env.TEMPLATES_ADDTHINGTOGROUP,
            parameters: awsThingTargets.map((thing) => ({
                ThingName: thing,
                ThingGroupName: thingGroupName,
            })),
        };

        // wait until the task is complete
        let task = await this.thingsService.bulkProvisionThings(params);
        task = await this.thingsService.getBulkProvisionTask(task.taskId);
        while (task.status !== 'Completed') {
            if (
                task.status === 'Failed' ||
                task.status === 'Cancelled' ||
                task.status === 'Cancelling'
            ) {
                throw new Error('EPHEMERAL_GROUP_CREATION_FAILURE');
            }
            await new Promise((resolve) => setTimeout(resolve, 2500));
            task = await this.thingsService.getBulkProvisionTask(task.taskId);
        }

        logger.debug(
            `workflow.startjob buildEphemeralGroup: exit:${thingGroupResponse.thingGroupArn}`,
        );
        return thingGroupResponse.thingGroupArn;
    }

    public ___testonly___getTargetType(target: string): TargetType {
        return this.getTargetType(target);
    }

    private getTargetType(target: string): TargetType {
        // arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/MyLightBulb
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

    private isDevice(arg: unknown): arg is Device10Resource {
        return arg && arg['deviceId'] && typeof arg['deviceId'] === 'string';
    }

    private async buildCommand(
        existing: CommandModel,
        updated: CommandModel,
    ): Promise<[CommandModel, TemplateModel]> {
        logger.debug(
            `workflow.startjob buildCommand: existing:${JSON.stringify(
                existing,
            )}, updated:${JSON.stringify(updated)}`,
        );

        // merge the existing command with the updated
        const merged: CommandModel = { ...existing, ...updated };

        // retrieve the template for the command
        const template = await this.templatesService.get(merged.templateId);

        // merge template config (command config overrides template config)
        if (merged.abortConfig) {
            merged.abortConfig = { ...template.abortConfig, ...merged.abortConfig };
        } else {
            merged.abortConfig = template.abortConfig;
        }
        if (merged.jobExecutionsRolloutConfig) {
            merged.jobExecutionsRolloutConfig = {
                ...template.jobExecutionsRolloutConfig,
                ...merged.jobExecutionsRolloutConfig,
            };
        } else {
            merged.jobExecutionsRolloutConfig = template.jobExecutionsRolloutConfig;
        }
        if (merged.timeoutConfig) {
            merged.timeoutConfig = { ...template.timeoutConfig, ...merged.timeoutConfig };
        } else {
            merged.timeoutConfig = template.timeoutConfig;
        }
        logger.debug(
            `workflow.startjob buildCommand: exit: ${JSON.stringify([merged, template])}`,
        );
        return [merged, template];
    }

    private assembleCreateJobRequest(
        jobTargets: string[],
        template: TemplateModel,
        command: CommandModel,
    ): AWS.Iot.CreateJobRequest {
        logger.debug(
            `workflow.startjob assembleCreateJobRequest: in: jobTargets:${JSON.stringify(
                jobTargets,
            )}, template:${JSON.stringify(template)}, command:${JSON.stringify(jobTargets)}`,
        );
        const params: AWS.Iot.CreateJobRequest = {
            jobId: `cdf-${command.commandId}`,
            targets: jobTargets,
            document: template.document,
            targetSelection: command.type,
        };

        if (template.presignedUrlExpiresInSeconds) {
            params.presignedUrlConfig = {
                expiresInSec: template.presignedUrlExpiresInSeconds,
                roleArn: this.s3RoleArn,
            };
        }

        if (command.abortConfig) {
            params.abortConfig = command.abortConfig;
        }
        if (command.jobExecutionsRolloutConfig) {
            params.jobExecutionsRolloutConfig = command.jobExecutionsRolloutConfig;
        }
        if (command.timeoutConfig) {
            params.timeoutConfig = command.timeoutConfig;
        }

        logger.debug(
            `workflow.startjob assembleCreateJobRequest: exit: ${JSON.stringify(params)}`,
        );
        return params;
    }
}

export const enum TargetType {
    awsIotThing,
    awsIotGroup,
    cdfDevice,
    cdfGroup,
}
