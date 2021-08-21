/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import 'reflect-metadata';
import { container } from './di/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import {logger} from './utils/logger';
import config from 'config';
import {Request, Response, NextFunction, Application} from 'express';
import {asArray, normalisePath, SupportedVersionConfig} from '@cdf/express-middleware';
import cors = require('cors');

const PORT = 3002;

logger.debug(`config: ${JSON.stringify(config.util.toObject(config))}`);

// Start the server
const server = new InversifyExpressServer(container);

// load in the supported versions
const supportedVersionConfig:SupportedVersionConfig = config.get('supportedApiVersions');
const supportedVersions:string[] = asArray(supportedVersionConfig);

server.setConfig((app) => {
  // only process requests that we can support the requested accept header
  app.use( (req:Request, res:Response, next:NextFunction)=> {
    if (supportedVersions.includes(req.headers['accept']) || req.method==='OPTIONS') {
      next();
    } else {
      res.status(415).send();
    }
  });

  app.use((req, _res, next) => {
    if (config.has('customDomain.basePath')) {
      const basePathToRemove = config.get<string>('customDomain.basePath')
      req.url = normalisePath(req.url, basePathToRemove);
      logger.debug(`${basePathToRemove} is removed from the request url`)
    }
    next();
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
