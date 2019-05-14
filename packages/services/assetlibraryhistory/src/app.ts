/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { container } from './di/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import {logger} from './utils/logger';
import morgan from 'morgan';

const CDF_V1_TYPE = 'application/vnd.aws-cdf-v1.0+json';

// Start the server
const server = new InversifyExpressServer(container);

server.setConfig((app) => {
  // only process requests with the correct versioned content type
  app.use(bodyParser.json({ type: CDF_V1_TYPE }));

  // set the versioned content type for all responses
  app.use( (__,res,next)=> {
    res.setHeader('Content-Type', CDF_V1_TYPE);
    next();
  });

  // log the requests
  app.use(morgan('combined'));
});

export const serverInstance = server.build();
serverInstance.listen(3003);

logger.info('Server started on port 3003 :)');
