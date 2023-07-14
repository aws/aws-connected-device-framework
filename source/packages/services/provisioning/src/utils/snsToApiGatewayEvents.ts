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
export class SnsToApiGatewayEvents {
    public buildApiGatewayEventFromSnsEvent(snsMessage: unknown): unknown {
        const apiGatewayEvent: unknown = {
            resource: '/{proxy+}',
            path: '/bulkcertificates',
            httpMethod: 'POST',
            headers: {
                Accept: 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
            },
            queryStringParameters: null,
            pathParameters: {
                proxy: 'bulkcertificates',
            },
            stageVariables: null,
            requestContext: null,
            body: JSON.stringify(snsMessage),
        };

        return apiGatewayEvent;
    }
}
