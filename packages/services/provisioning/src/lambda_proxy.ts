/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import * as awsServerlessExpress from 'aws-serverless-express';
import {serverInstance} from './app' ;
import { SnsToApiGatewayEvents } from './utils/snsToApiGatewayEvents';

const server = awsServerlessExpress.createServer(serverInstance);

const eventTranslator:SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

exports.handler = (event: any, context: any) => {
  console.log(`event: ${JSON.stringify(event)}`);
  console.log(`context: ${JSON.stringify(context)}`);

  // if SNS event, then transofrm it to look like API Gateway
  // TODO: for now this handles one event and assumes the topic
  //       this should be made more abstract to handle multiple message types / topics
  if (event.hasOwnProperty('Records')) {
    if (event.Records[0].EventSource === 'aws:sns') {
      const eventJson:any = JSON.parse(event.Records[0].Sns.Message);
      const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(eventJson);
      event = apiGatewayEvent;
    }
  }

  awsServerlessExpress.proxy(server, event, context);
};
