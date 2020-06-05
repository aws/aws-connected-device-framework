/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import serverlessHttp from 'serverless-http';
import { serverInstance } from './app' ;

exports.handler = serverlessHttp(serverInstance);
