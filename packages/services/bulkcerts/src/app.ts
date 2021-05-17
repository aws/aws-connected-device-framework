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
import cors = require('cors');

const PORT = 3005;

// Start the server
const server = new InversifyExpressServer(container);

// log detected config
logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

// load in the supported versions
const supportedVersionConfig:SupportedVersionConfig = config.get('supportedApiVersions');
const supportedVersions:string[] = asArray(supportedVersionConfig);

server.setConfig((app) => {
  // only process requests that we can support the requested accept header
  app.use( (req:Request, res:Response, next:NextFunction)=> {
    if (supportedVersions.includes(req.headers['accept']) || req.headers['accept']==='application/zip' 
      || req.method==='OPTIONS') {
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
  let exposedHeaders = config.get('cors.exposedHeaders') as string;
  if (exposedHeaders===null || exposedHeaders==='') {
    exposedHeaders=undefined;
  }
  if (corsAllowedOrigin !== null && corsAllowedOrigin !== '') {
    const c = cors({
      origin: corsAllowedOrigin,
      exposedHeaders
    });
    app.use(c);
  }
});

export const serverInstance:Application = server.build();
serverInstance.listen(PORT);

logger.info(`Server started on port ${PORT} :)`);
