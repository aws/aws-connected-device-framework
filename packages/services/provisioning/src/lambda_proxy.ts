/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import serverlessHttp from 'serverless-http';
import {serverInstance} from './app' ;
import { SnsToApiGatewayEvents } from './utils/snsToApiGatewayEvents';

const server = serverlessHttp(serverInstance);

const eventTranslator:SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async (event: any, context: AWSLambda.Context) => {
  // console.log(`event: ${JSON.stringify(event)}`);
  // console.log(`context: ${JSON.stringify(context)}`);

  // if SNS event, then transform it to look like API Gateway
  // TODO: for now this handles one event and assumes the topic
  //       this should be made more abstract to handle multiple message types / topics
  if (Object.prototype.hasOwnProperty.call(event,'Records')) {
    if (event.Records[0].EventSource === 'aws:sns') {
      const eventJson = JSON.parse(event.Records[0].Sns.Message);
      const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(eventJson);
      event = apiGatewayEvent;
    }
  }

  return await server(event, context);
};
