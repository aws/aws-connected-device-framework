/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import * as awsServerlessExpress from 'aws-serverless-express';
import {serverInstance} from './app' ;
import { SnsToApiGatewayEvents, Message } from './utils/snsToApiGatewayEvents';

// 3rd argument is binary mime types - required to serve zip files for /certificates
const server = awsServerlessExpress.createServer(serverInstance, null, ['application/zip']);

const eventTranslator:SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = (event: any, context: any) => {
  // if SNS event, then transform it to look like API Gateway
  // TODO: for now this handles one event and assumes the topic
  //       this should be made more abstract to handle multiple message types / topics
  if (Object.prototype.hasOwnProperty.call(event,'Records')) {
    const r = event.Records[0];
    if (r.EventSource === 'aws:sns') {
      const eventJson:Message = JSON.parse(r.Sns.Message);
      const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(r.Sns.Subject, eventJson);
      event = apiGatewayEvent;
    }
  }

  awsServerlessExpress.proxy(server, event, context);
};
