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
import { injectable } from 'inversify';
import { logger } from '@awssolutions/simple-cdf-logger';
import {
    CommandItem,
    CommandListPaginationKey,
    CommandResource,
    CommandResourceList,
    EditableCommandResource,
    JobDeliveryMethod,
    ShadowDeliveryMethod,
    TopicDeliveryMethod,
} from './commands.models';

@injectable()
export class CommandsAssembler {

    public toResource(item: CommandItem): CommandResource {
        logger.debug(`commands.assembler toResource: in: item:${JSON.stringify(item)}`);

        const resource: CommandResource = {
            id: item.id,
            operation: item.operation,
            deliveryMethod: item.deliveryMethod,
            payloadTemplate: item.payloadTemplate,
            enabled: item.enabled,
            payloadParams: item.payloadParams,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
            tags: item.tags,
        }

        logger.debug(`commands.assembler toResource: exit:${JSON.stringify(resource)}`);
        return resource;
    }

    public toItem(resource: EditableCommandResource): CommandItem {
        logger.debug(`commands.assembler toItem: in: resource:${JSON.stringify(resource)}`);

        const item: CommandItem = {
            operation: resource.operation,
            payloadTemplate: resource.payloadTemplate,
            payloadParams: resource.payloadParams,
            enabled: resource.enabled,
            tags: resource.tags,
        }

        let deliveryMethod: TopicDeliveryMethod | ShadowDeliveryMethod | JobDeliveryMethod;
        switch (resource.deliveryMethod?.type) {
            case 'TOPIC':
                deliveryMethod = {
                    type: 'TOPIC',
                    expectReply: resource.deliveryMethod.expectReply ?? false,
                    onlineOnly: resource.deliveryMethod.onlineOnly,
                } as TopicDeliveryMethod;
                break;
            case 'SHADOW':
                deliveryMethod = {
                    type: 'SHADOW',
                    expectReply: resource.deliveryMethod.expectReply ?? false,
                } as ShadowDeliveryMethod;
                break;
            case 'JOB': {
                const res = resource.deliveryMethod as JobDeliveryMethod;
                deliveryMethod = {
                    type: 'JOB',
                    expectReply: res.expectReply ?? false,
                    targetSelection: res.targetSelection,
                } as JobDeliveryMethod;
                if (res.presignedUrlConfig?.expiresInSec) {
                    deliveryMethod.presignedUrlConfig = {
                        expiresInSec: res.presignedUrlConfig.expiresInSec,
                    };
                }
                if (res.jobExecutionsRolloutConfig) {
                    deliveryMethod.jobExecutionsRolloutConfig = {
                        maximumPerMinute: res.jobExecutionsRolloutConfig.maximumPerMinute,
                    };
                    if (res.jobExecutionsRolloutConfig.exponentialRate) {
                        deliveryMethod.jobExecutionsRolloutConfig.exponentialRate = {
                            baseRatePerMinute: res.jobExecutionsRolloutConfig.exponentialRate.baseRatePerMinute,
                            incrementFactor: res.jobExecutionsRolloutConfig.exponentialRate.incrementFactor,
                            rateIncreaseCriteria: {
                                numberOfNotifiedThings: res.jobExecutionsRolloutConfig.exponentialRate.rateIncreaseCriteria.numberOfNotifiedThings,
                                numberOfSucceededThings: res.jobExecutionsRolloutConfig.exponentialRate.rateIncreaseCriteria.numberOfSucceededThings,
                            }
                        };
                    }
                }
                if (res.abortConfig) {
                    deliveryMethod.abortConfig = {
                        criteriaList: res.abortConfig.criteriaList?.map(c => ({
                            failureType: c.failureType,
                            action: c.action,
                            thresholdPercentage: c.thresholdPercentage,
                            minNumberOfExecutedThings: c.minNumberOfExecutedThings,
                        })),
                    }
                }
                if (res.timeoutConfig) {
                    deliveryMethod.timeoutConfig = {
                        inProgressTimeoutInMinutes: res.timeoutConfig.inProgressTimeoutInMinutes,
                    }
                }
                break;
            }
            default:
        }
        item.deliveryMethod = deliveryMethod;



        logger.debug(`commands.assembler toItem: exit:${JSON.stringify(item)}`);
        return item;
    }

    public toResourceList(commands: CommandItem[], count?: number, paginateFrom?: CommandListPaginationKey): CommandResourceList {
        logger.debug(`commands.assembler toResourceList: in: commands:${JSON.stringify(commands)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

        const list: CommandResourceList = {
            commands: []
        };

        if (count !== undefined || paginateFrom !== undefined) {
            list.pagination = {};
        }

        if (count !== undefined) {
            list.pagination.count = count;
        }

        if (paginateFrom !== undefined) {
            list.pagination.lastEvaluated = {
                commandId: paginateFrom?.commandId
            };
        }

        if ((commands?.length ?? 0) > 0) {
            list.commands = commands.map(c => this.toResource(c));
        }

        logger.debug(`commands.assembler toResourceList: exit: ${JSON.stringify(list)}`);
        return list;

    }
}
