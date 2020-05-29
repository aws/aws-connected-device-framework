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
import config from 'config';
import {Request, Response, NextFunction, Application} from 'express';
import {asArray, SupportedVersionConfig} from '@cdf/express-middleware';

const PORT = 3005;

// Start the server
const server = new InversifyExpressServer(container);

// load in the supported versions
const supportedVersionConfig:SupportedVersionConfig = config.get('supportedApiVersions');
const supportedVersions:string[] = asArray(supportedVersionConfig);

server.setConfig((app) => {
  // only process requests that we can support the requested accept header
  app.use( (req:Request, res:Response, next:NextFunction)=> {
    if (supportedVersions.includes(req.headers['accept']) || req.headers['accept']==='application/zip') {
      next();
    } else {
      res.status(415).send();
    }
  });
  app.use(bodyParser.json({ type: supportedVersions }));

  // default the response's headers
  app.use( (req,res,next)=> {
    const ct = res.getHeader('Content-Type');
    if (ct===undefined || ct===null) {
      res.setHeader('Content-Type', req.headers['accept']);
    }
    next();
  });

  // enable cors
  const corsAllowedOrigin = config.get('cors.origin') as string;
  if (corsAllowedOrigin !== null && corsAllowedOrigin !== '') {
    const cors = require('cors')({
      origin: corsAllowedOrigin
    });
    app.use(cors);
  }
});

export const serverInstance:Application = server.build();
serverInstance.listen(PORT);

logger.info(`Server started on port ${PORT} :)`);
