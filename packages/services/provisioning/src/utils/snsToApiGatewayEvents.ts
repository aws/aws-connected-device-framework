/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class SnsToApiGatewayEvents {

    public buildApiGatewayEventFromSnsEvent(snsMessage:any): any {
        const apiGatewayEvent:any = {
            'resource': '/{proxy+}',
            'path': '/bulkcertificates',
            'httpMethod': 'POST',
            'headers': {
                'Accept': 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            'queryStringParameters': null,
            'pathParameters': {
                'proxy': 'bulkcertificates'
            },
            'stageVariables': null,
            'requestContext': null,
            'body': JSON.stringify(snsMessage)
        };

        return apiGatewayEvent;
    }
}
