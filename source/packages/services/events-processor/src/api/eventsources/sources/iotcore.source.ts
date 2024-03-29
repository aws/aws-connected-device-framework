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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { v1 as uuid } from 'uuid';
import { TYPES } from '../../../di/types';
import { EventSourceDetailResource } from '../eventsource.models';
import { EventSource } from './source.interface';

@injectable()
export class IotCoreEventSource implements EventSource {
    private iot: AWS.Iot;
    private lambda: AWS.Lambda;

    constructor(
        @inject('aws.region') private region: string,
        @inject('aws.accountId') private accountId: string,
        @inject('aws.lambda.lambdaInvoke.arn') private lambdaInvokeEntryLambda: string,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.LambdaFactory) lambdaFactory: () => AWS.Lambda
    ) {
        this.iot = iotFactory();
        this.lambda = lambdaFactory();
    }

    private ruleName(eventSourceId: string): string {
        return `cdfEvents_eventSource_${eventSourceId.replace(/-/g, '_')}`;
    }
    private ruleArn(eventSourceId: string): string {
        return `arn:aws:iot:${this.region}:${this.accountId}:rule/${this.ruleName(eventSourceId)}`;
    }

    public async create(model: EventSourceDetailResource): Promise<void> {
        logger.debug(`iotcore.source create in: model:${JSON.stringify(model)}`);

        ow(model, ow.object.nonEmpty);
        ow(model.principal, ow.string.nonEmpty);
        ow(model.iotCore, ow.object.nonEmpty);
        ow(model.iotCore.attributes, ow.object.nonEmpty);
        ow(model.iotCore.mqttTopic, ow.string.nonEmpty);

        // assign a unique event source id
        if (model.id === undefined) {
            model.id = uuid();
        }

        // build the iotcore rule sql
        const i = model.iotCore;
        let sql = `SELECT "${model.id}" AS eventSourceId, "${model.principal}" AS principal, ${model.principal} AS principalValue`;
        for (const k of Object.keys(i.attributes)) {
            sql += `, ${i.attributes[k]} AS attributes.${k}`;
        }
        sql += ` FROM '${i.mqttTopic}'`;

        // create the rule and wire it to the lambda entrypoint
        const ruleParams: AWS.Iot.Types.CreateTopicRuleRequest = {
            ruleName: this.ruleName(model.id),
            topicRulePayload: {
                actions: [
                    {
                        lambda: {
                            functionArn: this.lambdaInvokeEntryLambda,
                        },
                    },
                ],
                sql,
                awsIotSqlVersion: '2016-03-23',
                description: `Auto-created rule by the CDF Events service, to forward requests from IoT Core for event source ${model.id}.`,
            },
        };
        await this.iot.createTopicRule(ruleParams).promise();

        // allow the rule permission to execute the lambda
        const lambdaParams: AWS.Lambda.Types.AddPermissionRequest = {
            StatementId: ruleParams.ruleName,
            SourceArn: this.ruleArn(model.id),
            Action: 'lambda:InvokeFunction',
            Principal: 'iot.amazonaws.com',
            FunctionName: this.lambdaInvokeEntryLambda,
        };
        await this.lambda.addPermission(lambdaParams).promise();

        logger.debug(`iotcore.source create: exit:`);
    }

    public async delete(eventSourceId: string): Promise<void> {
        logger.debug(`iotcore.source delete: in: eventSourceId:${eventSourceId}`);

        ow(eventSourceId, ow.string.nonEmpty);

        try {
            // clean up the rule
            const params: AWS.Iot.Types.DeleteTopicRuleRequest = {
                ruleName: this.ruleName(eventSourceId),
            };
            await this.iot.deleteTopicRule(params).promise();
            // clean up the lambda permissions
            await this.lambda
                .removePermission({
                    FunctionName: this.lambdaInvokeEntryLambda,
                    StatementId: this.ruleName(eventSourceId),
                })
                .promise();
        } catch (e) {
            logger.warn(`iotcore.source delete: e:`, e);
        }

        logger.debug(`iotcore.source delete: exit:`);
    }
}
