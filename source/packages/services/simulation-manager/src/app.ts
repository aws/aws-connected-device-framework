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

const CDF_V1_TYPE = 'application/vnd.aws-cdf-v1.0+json';
const corsAllowedOrigin = config.get('cors.origin') as string;
const PORT = 3100;

// Start the server
const server = new InversifyExpressServer(container);

logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

server.setConfig((app) => {
  // only process requests with the correct versioned content type
  app.use(bodyParser.json({ type: CDF_V1_TYPE }));

  // set the versioned content type for all responses
  app.use( (__: Request, res: Response, next: NextFunction)=> {
    res.setHeader('Content-Type', CDF_V1_TYPE);
    if (corsAllowedOrigin !== null && corsAllowedOrigin !== '') {
      res.setHeader('Access-Control-Allow-Origin', corsAllowedOrigin);
    }
    next();
  });
});

export const serverInstance:Application = server.build();
serverInstance.listen(PORT);

logger.info(`Server started on port ${PORT} :)`);
