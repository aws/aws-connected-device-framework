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
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';

import ow from 'ow';
import { logger } from '../utils/logger';

import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';

@injectable()
export class RotateCertificatesJobCustomResource implements CustomResource {

    protected headers:{[key:string]:string};
    private DEFAULT_MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';
    private mimeType:string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {
        this.mimeType=this.DEFAULT_MIME_TYPE;
    }

    public async create(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        const functionName = customResourceEvent?.ResourceProperties?.CommandsFunctionName;
        const thingArn = customResourceEvent?.ResourceProperties?.ThingGroupArn;
        const mqttGetTopic  = customResourceEvent?.ResourceProperties?.MQTTGetTopic;
        const mqttAckTopic  = customResourceEvent?.ResourceProperties?.MQTTAckTopic;

        ow(functionName, ow.string.nonEmpty);
        ow(thingArn, ow.string.nonEmpty);
        ow(mqttGetTopic, ow.string.nonEmpty);
        ow(mqttAckTopic, ow.string.nonEmpty);

        await this.createRotateCertificatesJobTemplate(functionName);
        const commandLocation = await this.createRotateCertificatesJob(functionName, thingArn, mqttGetTopic, mqttAckTopic);
        await this.publishRotateCertificatesJob(functionName, commandLocation);
        return {};
    }

    public async update(_customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        return {};
    }

    public async delete(_customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        return {};
    }

    protected getHeaders(): {[key:string]:string} {
        if (this.headers===undefined) {
            const h = {
                'Accept': this.mimeType,
                'Content-Type': this.mimeType
            };
            this.headers = {...h};
        }
        return this.headers;
    }

    protected async createRotateCertificatesJobTemplate(functionName: string) : Promise<unknown> {
        logger.debug(`RotateCertificatesJobCustomResource: createRotateCertificatesJobTemplate: in: `);
        const payload = {
            'templateId': 'RotateCertificates',
            'description': 'Rotate certificates',
            'operation' : 'RotateCertificates',
            'document': '{"get":{"subscribe":"${cdf:parameter:getSubscribeTopic}","publish":"${cdf:parameter:getPublishTopic}"},"ack":{"subscribe":"${cdf:parameter:ackSubscribeTopic}","publish":"${cdf:parameter:ackPublishTopic}"}}',
            'requiredDocumentParameters': [
                'getSubscribeTopic',
                'getPublishTopic',
                'ackSubscribeTopic',
                'ackPublishTopic'
            ]
        };
        const path = '/templates';
        try {
            const createRotateCertificatesJobTemplate = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath(path)
            .setHeaders(this.getHeaders())
            .setBody(payload);

         const res = await this.lambdaInvoker.invoke(functionName, createRotateCertificatesJobTemplate);
         logger.debug(`CommandsCommandCustomResource: create: create res: ${JSON.stringify(res)}`);
         return res;
        } catch(error) {
            if (error.status === 409) {
                logger.warn(`CommandsCommandCustomResource: createRotateCertificatesJobTemplate: error: RotateCertificates already exists`);
                return {}
            }
            throw error;
        }
    }

    protected async createRotateCertificatesJob(functionName: string, thingGroupArn: string, mqttGetTopic:string, mqttAckTopic:string) : Promise<string> {
        logger.debug(`RotateCertificatesJobCustomResource: :createRotateCertificatesJob in: `);

        const oldText = '/+/';
        const newText = '/{thingName}/';
        const getSubscribeTopic = `${mqttGetTopic}/${oldText}/${newText}/+`;
        const getPublishTopic = `${mqttGetTopic}/${oldText}/${newText}`;
        const ackSubscribeTopic = `${mqttAckTopic}/${oldText}/${newText}/+`;
        const ackPublishTopic = `${mqttAckTopic}/${oldText}/${newText}`;

        const payload = {
            'templateId': 'RotateCertificates',
            'targets': [ thingGroupArn ],
            'type': 'CONTINUOUS',
            'rolloutMaximumPerMinute': 120,
            'documentParameters': {
                'getSubscribeTopic': getSubscribeTopic,
                'getPublishTopic': getPublishTopic,
                'ackSubscribeTopic': ackSubscribeTopic,
                'ackPublishTopic': ackPublishTopic
            }
        };

        const path = '/commands';

        const createRotateCertificatesJob = new LambdaApiGatewayEventBuilder()
        .setMethod('POST')
        .setPath(path)
        .setHeaders(this.getHeaders())
        .setBody(payload);

        const result = await this.lambdaInvoker.invoke(functionName, createRotateCertificatesJob);

        logger.debug(`RotateCertificatesJobCustomResource: :createRotateCertificatesJob out: ${JSON.stringify(result)}`);
        return result?.header?.location;
    }

    protected async publishRotateCertificatesJob(functionName: string, commandLocation: string) : Promise<unknown> {
        logger.debug(`RotateCertificatesJobCustomResource: :publishRotateCertificatesJob in: `);
        const payload = {
            'commandStatus': 'PUBLISHED'
        };

        const publishRotateCertificatesJob = new LambdaApiGatewayEventBuilder()
        .setMethod('PATCH')
        .setPath(commandLocation)
        .setHeaders(this.getHeaders())
        .setBody(payload);

        const result = await this.lambdaInvoker.invoke(functionName, publishRotateCertificatesJob);

        logger.debug(`RotateCertificatesJobCustomResource: :publishRotateCertificatesJob out: ${JSON.stringify(result)}`);
        return {};
    }
}


