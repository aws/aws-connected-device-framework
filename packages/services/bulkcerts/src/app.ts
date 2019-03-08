/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { container } from './di/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import {logger} from './utils/logger';
import config from 'config';

const CDF_V1_TYPE = 'application/vnd.aws-cdf-v1.0+json';
const corsAllowedOrigin = config.get('cors.origin') as string;
const PORT = 3005;

// Start the server
const server = new InversifyExpressServer(container);

server.setConfig((app) => {
  // only process requests with the correct versioned content type
  app.use(bodyParser.json({ type: CDF_V1_TYPE }));

  // set the versioned content type for all responses
  app.use( (__,res,next)=> {
    res.setHeader('Content-Type', CDF_V1_TYPE);
    if (corsAllowedOrigin !== null && corsAllowedOrigin !== '') {
      res.setHeader('Access-Control-Allow-Origin', corsAllowedOrigin);
    }
    next();
  });
});

export const serverInstance = server.build();
serverInstance.listen(PORT);

logger.info(`Server started on port ${PORT} :)`);
