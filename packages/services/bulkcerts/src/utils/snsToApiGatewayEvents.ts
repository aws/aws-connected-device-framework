/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import ow from 'ow';
export class SnsToApiGatewayEvents {

    public buildApiGatewayEventFromSnsEvent(subject:string, snsMessage:any): any {
        console.log(`snsToApiGatewayEvents buildApiGatewayEventFromSnsEvent: in: subject:${subject}, snsMessage:${JSON.stringify(snsMessage)}`);

        let event:string;
        switch(subject) {
            case 'CreateChunk':
                event = this.processCreateChunk(snsMessage);
                break;
            default:
        }

        console.log(`snsToApiGatewayEvents buildApiGatewayEventFromSnsEvent: exit: event:${JSON.stringify(event)}`);
        return event;

    }

    private processCreateChunk(msg:any) {
        const taskId = msg.taskId;
        const chunkId:number = msg.chunkId;

        ow(taskId, ow.string.nonEmpty);
        ow(chunkId, ow.number.greaterThan(0));

        const path = `/certificates/${taskId}/chunks/${chunkId}`;

        const apiGatewayEvent:any = {
            resource: '/{proxy+}',
            path,
            httpMethod: 'POST',
            headers: {
                Accept: 'application/vnd.aws-cdf-v1.0+json',
                'Content-Type': 'application/vnd.aws-cdf-v1.0+json'
            },
            queryStringParameters: null,
            pathParameters: {
                proxy: path
            },
            stageVariables: null,
            requestContext: null,
            body: JSON.stringify(msg)
        };

        return apiGatewayEvent;
    }
}
