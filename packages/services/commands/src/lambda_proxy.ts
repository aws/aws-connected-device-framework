/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import * as awsServerlessExpress from 'aws-serverless-express';
import {serverInstance} from './app' ;

const server = awsServerlessExpress.createServer(serverInstance);

exports.rest_handler = (event: any, context: any) => {
  console.log(`event: ${JSON.stringify(event)}  context: ${JSON.stringify(context)}`);
  awsServerlessExpress.proxy(server, event, context);
};
