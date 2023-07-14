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
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';
import { logger } from '@awssolutions/simple-cdf-logger';
import ow from 'ow';

type StackEventPayload = { [key: string]: string };

interface StackEvent {
    eventName: 'CDFStackCreated' | 'CDFStackUpdated';
    status: 'CREATED' | 'UPDATED';
    stackName: string;
    region: string;
    accountId: string;
    payload?: StackEventPayload;
}

const { AWS_REGION } = process.env;

@injectable()
export class StackEventsCustomResource implements CustomResource {
    private eventBridge: AWS.EventBridge;
    private sts: AWS.STS;

    constructor(
        @inject(TYPES.EventBridgeFactory)
        private eventBridgeFactory: (region: string) => AWS.EventBridge,
        @inject(TYPES.STSFactory) stsFactory: () => AWS.STS,
    ) {
        this.sts = stsFactory();
    }

    private async publishEvent(
        eventBusName: string,
        stackName: string,
        payload?: StackEventPayload,
    ) {
        const eventSource = 'com.aws.cdf.customresource';
        const eventDetailType = 'CDF Deployment Events via CloudFormation Custom Resource';

        const eventbridgeKeys = eventBusName.split(':');
        this.eventBridge = this.eventBridgeFactory(eventbridgeKeys[3]);

        try {
            const accountId = (await this.sts.getCallerIdentity().promise()).Account;
            const stackEvent: StackEvent = {
                eventName: 'CDFStackCreated',
                stackName,
                accountId,
                region: AWS_REGION,
                status: 'CREATED',
                payload,
            };

            await this.eventBridge
                .putEvents({
                    Entries: [
                        {
                            EventBusName: eventBusName,
                            Source: eventSource,
                            DetailType: eventDetailType,
                            Detail: JSON.stringify(stackEvent),
                        },
                    ],
                })
                .promise();
        } catch (Exception) {
            logger.error(Exception);
        }
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `StackEventsCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const eventBusName = customResourceEvent?.ResourceProperties?.EventBusName;
        const stackName = customResourceEvent?.ResourceProperties?.StackName;
        const payload = customResourceEvent?.ResourceProperties?.Payload;

        ow(stackName, ow.string.nonEmpty);
        ow(eventBusName, ow.string.nonEmpty);

        await this.publishEvent(eventBusName, stackName, payload as unknown as StackEventPayload);

        logger.debug(`StackEventsCustomResource: create: exit:`);
        return {};
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `StackEventsCustomResource: update: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const eventBusName = customResourceEvent?.ResourceProperties?.EventBusName;
        const stackName = customResourceEvent?.ResourceProperties?.StackName;
        const payload = customResourceEvent?.ResourceProperties?.Payload;

        ow(stackName, ow.string.nonEmpty);
        ow(eventBusName, ow.string.nonEmpty);

        await this.publishEvent(eventBusName, stackName, payload as unknown as StackEventPayload);

        logger.debug(`StackEventsCustomResource: update: exit:`);
        return {};
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(`StackEventsCustomResource: delete: in:`);
        logger.debug(`StackEventsCustomResource: delete: no operation to perform`);
        logger.debug(`StackEventsCustomResource: delete: exit:`);
        return {};
    }
}
