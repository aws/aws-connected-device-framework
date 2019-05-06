/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import * as awsServerlessExpress from 'aws-serverless-express';
import {serverInstance} from './app' ;
import { SnsToApiGatewayEvents } from './utils/snsToApiGatewayEvents';

// 3rd argument is binary mime types - required to serve zip files for /certificates
const server = awsServerlessExpress.createServer(serverInstance, null, ['application/zip']);

const eventTranslator:SnsToApiGatewayEvents = new SnsToApiGatewayEvents();

exports.handler = (event: any, context: any) => {
  // if SNS event, then transform it to look like API Gateway
  // TODO: for now this handles one event and assumes the topic
  //       this should be made more abstract to handle multiple message types / topics
  if (event.hasOwnProperty('Records')) {
    const r = event.Records[0];
    if (r.EventSource === 'aws:sns') {
      const eventJson:any = JSON.parse(r.Sns.Message);
      const apiGatewayEvent = eventTranslator.buildApiGatewayEventFromSnsEvent(r.Sns.Subject, eventJson);
      event = apiGatewayEvent;
    }
  }

  awsServerlessExpress.proxy(server, event, context);
};
