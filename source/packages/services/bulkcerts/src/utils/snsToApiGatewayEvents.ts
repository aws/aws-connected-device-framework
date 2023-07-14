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
import ow from 'ow';
import { logger } from '@awssolutions/simple-cdf-logger';
export class SnsToApiGatewayEvents {
    public buildApiGatewayEventFromSnsEvent(subject: string, snsMessage: Message): string {
        logger.debug(
            `snsToApiGatewayEvents buildApiGatewayEventFromSnsEvent: in: subject:${subject}, snsMessage:${JSON.stringify(
                snsMessage,
            )}`,
        );

        let event: string;
        switch (subject) {
            case 'CreateChunk':
                event = this.processCreateChunk(snsMessage);
                break;
            default:
        }

        logger.debug(
            `snsToApiGatewayEvents buildApiGatewayEventFromSnsEvent: exit: event:${JSON.stringify(
                event,
            )}`,
        );
        return event;
    }

    private processCreateChunk(msg: Message) {
        const taskId = msg.taskId;
        const chunkId: number = msg.chunkId;

        ow(taskId, ow.string.nonEmpty);
        ow(chunkId, ow.number.greaterThan(0));

        const path = `/certificates/${taskId}/chunks/${chunkId}`;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const apiGatewayEvent: any = {
            resource: '/{proxy+}',
            path,
            httpMethod: 'POST',
            headers: {
                Accept: 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
            },
            queryStringParameters: null,
            pathParameters: {
                proxy: path,
            },
            stageVariables: null,
            requestContext: null,
            body: JSON.stringify(msg),
        };

        return apiGatewayEvent;
    }
}

export interface Message {
    taskId: string;
    chunkId: number;
}
