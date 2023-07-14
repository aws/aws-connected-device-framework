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

import serverlessHttp from 'serverless-http';
import { serverInstance } from './app';
import { SnsToApiGatewayEvents } from './utils/snsToApiGatewayEvents';

const server = serverlessHttp(serverInstance);

const eventTranslator: SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async (event: any, context: AWSLambda.Context) => {
    // if SNS event, then transform it to look like API Gateway
    // TODO: for now this handles one event and assumes the topic
    //       this should be made more abstract to handle multiple message types / topics
    if (event.hasOwnProperty('Records')) {
        if (event.Records[0].EventSource === 'aws:sns') {
            const eventJson = JSON.parse(event.Records[0].Sns.Message);
            const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(eventJson);
            event = apiGatewayEvent;
        }
    }

    return await server(event, context);
};
