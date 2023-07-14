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
import { injectable } from 'inversify';
import {
    AssembledAlert,
    DynamodDBTargetItem,
    EmailTargetItem,
    MQTTTargetItem,
    PushTargetItem,
    RawAlert,
    SMSTargetItem,
} from './models';

@injectable()
export class AlertAssembler {
    public assembleAlert(raw: RawAlert): AssembledAlert {
        logger.debug(`assembleAlert: raw: ${JSON.stringify(raw)}`);

        const templatePropertiesData: { [key: string]: string | number | boolean } = {};
        if (raw.templatePropertiesData?.M) {
            Object.keys(raw.templatePropertiesData.M).forEach((k) => {
                templatePropertiesData[k] =
                    raw.templatePropertiesData.M[k].N ?? raw.templatePropertiesData.M[k].S;
            });
        }

        const targetsM = raw.targets?.M;

        const email: EmailTargetItem[] = [];
        if (targetsM.email?.L?.length > 0) {
            email.push(
                ...targetsM.email.L.map((j) => {
                    return {
                        address: j.M?.address?.S,
                    };
                }),
            );
        }
        if (targetsM.email?.M) {
            email.push({
                address: targetsM.email.M.address?.S,
            });
        }

        const mqtt: MQTTTargetItem[] = [];
        if (targetsM.mqtt?.L?.length > 0) {
            mqtt.push(
                ...targetsM.mqtt.L.map((j) => {
                    return {
                        topic: j.M?.topic?.S,
                    };
                }),
            );
        }
        if (targetsM.mqtt?.M) {
            mqtt.push({
                topic: targetsM.mqtt.M.topic?.S,
            });
        }

        const sms: SMSTargetItem[] = [];
        if (targetsM.sms?.L?.length > 0) {
            sms.push(
                ...targetsM.sms.L.map((j) => {
                    return {
                        phoneNumber: j.M?.phoneNumber?.S,
                    };
                }),
            );
        }
        if (targetsM.sms?.M) {
            sms.push({
                phoneNumber: targetsM.sms.M.phoneNumber?.S,
            });
        }

        const dynamodb: DynamodDBTargetItem[] = [];
        if (targetsM.dynamodb?.L?.length > 0) {
            dynamodb.push(
                ...targetsM.dynamodb.L.map((ddb) => {
                    const attributeMapping: { [key: string]: string } = {};
                    if (ddb.M?.attributeMapping?.M) {
                        Object.keys(ddb.M.attributeMapping.M).forEach((k) => {
                            attributeMapping[k] = ddb.M.attributeMapping.M[k].S;
                        });
                    }
                    return {
                        tableName: ddb.M?.tableName?.S,
                        attributeMapping,
                    };
                }),
            );
        }
        if (targetsM.dynamodb?.M) {
            const attributeMapping: { [key: string]: string } = {};
            if (targetsM.dynamodb.M.attributeMapping?.M) {
                Object.keys(targetsM.dynamodb.M.attributeMapping.M).forEach((k) => {
                    attributeMapping[k] = targetsM.dynamodb.M.attributeMapping.M[k].S;
                });
            }
            dynamodb.push({
                tableName: targetsM.dynamodb.M.tableName?.S,
                attributeMapping,
            });
        }

        const push_gcm: PushTargetItem[] = [];
        if (targetsM.push_gcm?.L?.length > 0) {
            push_gcm.push(
                ...targetsM.push_gcm.L.map((j) => {
                    return {
                        platformEndpointArn: j.M?.platformEndpointArn?.S,
                    };
                }),
            );
        }
        if (targetsM.push_gcm?.M) {
            push_gcm.push({
                platformEndpointArn: targetsM.push_gcm.M.platformEndpointArn?.S,
            });
        }

        const push_adm: PushTargetItem[] = [];
        if (targetsM.push_adm?.L?.length > 0) {
            push_adm.push(
                ...targetsM.push_adm.L.map((j) => {
                    return {
                        platformEndpointArn: j.M?.platformEndpointArn?.S,
                    };
                }),
            );
        }
        if (targetsM.push_adm?.M) {
            push_adm.push({
                platformEndpointArn: targetsM.push_adm.M.platformEndpointArn?.S,
            });
        }

        const push_apns: PushTargetItem[] = [];
        if (targetsM.push_apns?.L?.length > 0) {
            push_apns.push(
                ...targetsM.push_apns.L.map((j) => {
                    return {
                        platformEndpointArn: j.M?.platformEndpointArn?.S,
                    };
                }),
            );
        }
        if (targetsM.push_apns?.M) {
            push_apns.push({
                platformEndpointArn: targetsM.push_apns.M.platformEndpointArn?.S,
            });
        }

        const assembled: AssembledAlert = {
            version: Number(raw.version?.N),
            eventId: raw.eventId?.S,
            eventName: raw.eventName?.S,
            templatePropertiesData,
            time: raw.time?.S,
            userId: raw.userId?.S,
            snsTopicArn: raw.snsTopicArn?.S,
            targets: {
                email,
                dynamodb,
                mqtt,
                push_gcm,
                push_adm,
                push_apns,
                sms,
            },
        };

        logger.debug(`assembleAlert: exit: ${JSON.stringify(assembled)}`);
        return assembled;
    }
}
