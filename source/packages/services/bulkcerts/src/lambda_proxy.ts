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
import * as awsServerlessExpress from 'aws-serverless-express';
import { serverInstance } from './app';
import { Message, SnsToApiGatewayEvents } from './utils/snsToApiGatewayEvents';

// 3rd argument is binary mime types - required to serve zip files for /certificates
const server = awsServerlessExpress.createServer(serverInstance, null, ['application/zip']);

const eventTranslator: SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = (event: any, context: any) => {
    // if SNS event, then transform it to look like API Gateway
    // TODO: for now this handles one event and assumes the topic
    //       this should be made more abstract to handle multiple message types / topics
    if (event.hasOwnProperty('Records')) {
        const r = event.Records[0];
        if (r.EventSource === 'aws:sns') {
            const eventJson: Message = JSON.parse(r.Sns.Message);
            const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(
                r.Sns.Subject,
                eventJson,
            );
            event = apiGatewayEvent;
        }
    }

    awsServerlessExpress.proxy(server, event, context);
};
