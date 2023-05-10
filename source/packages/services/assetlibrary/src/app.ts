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
import { container } from './di/inversify.config';

import { json } from 'body-parser';
import { Application, NextFunction, Request, Response } from 'express';
import expressVersionRequest from 'express-version-request';
import { InversifyExpressServer } from 'inversify-express-utils';

import { DEFAULT_MIME_TYPE, normalisePath } from '@awssolutions/cdf-express-middleware';

import { setClaims } from './authz/authz.middleware';
import { logger } from './utils/logger';

import cors = require('cors');

// Start the server
const server = new InversifyExpressServer(container);

// load in the supported versions
const supportedVersions: string[] = process.env.SUPPORTED_API_VERSIONS?.split(',') || [];

server.setConfig((app) => {

  // only process requests that we can support the requested accept header
  app.use( (req:Request, _res:Response, next:NextFunction)=> {
    if (supportedVersions.includes(req.headers['accept']) || req.method==='OPTIONS') {
      next();
    } else {
      // res.status(415).send();
      // if not recognised, default to v1
      req.headers['accept'] = DEFAULT_MIME_TYPE;
      req.headers['content-type'] = DEFAULT_MIME_TYPE;
      next();
    }
  });
 
  app.use((req, _res, next) => {
      const customDomainPath = process.env.CUSTOM_DOMAIN_BASE_PATH;
      if (customDomainPath) {
          req.url = normalisePath(req.url, customDomainPath);
          logger.silly(`${customDomainPath} is removed from the request url`)
      }
      next();
  });

  app.use(json({ type: supportedVersions }));

  // extrapolate the version from the header and place on the request to make to easier for the controllers to deal with
  app.use(expressVersionRequest.setVersionByAcceptHeader());

  // if authz is enabled, parse the claims
  if (process.env.AUTHORIZATION_ENABLED==="true") {
    app.use(setClaims()) ;
  }

  // default the response's headers
  app.use( (req,res,next)=> {
    const ct = res.getHeader('Content-Type');
    if (ct===undefined || ct===null) {
      res.setHeader('Content-Type', req.headers['accept']);
    }
    next();
  });

  // enable cors
  const corsAllowedOrigin = process.env.CORS_ORIGIN;
  let exposedHeaders = process.env.CORS_EXPOSED_HEADERS;
  if (exposedHeaders === null || exposedHeaders === '') {
      exposedHeaders = undefined;
  }
  if (corsAllowedOrigin?.length>0) {
      const c = cors({
          origin: corsAllowedOrigin,
          exposedHeaders
      });
      app.use(c);
  }

});

export const serverInstance:Application = server.build();
const port = process.env.PORT;
serverInstance.listen(port);

logger.info(`Server started on port ${port} :)`);
