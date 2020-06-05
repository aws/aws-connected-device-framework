/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import {Request, Response, NextFunction, Application} from 'express';

import { container } from './di/inversify.config';
import { InversifyExpressServer } from 'inversify-express-utils';
import * as bodyParser from 'body-parser';
import { logger } from './utils/logger';
import config from 'config';
import {asArray, SupportedVersionConfig, DEFAULT_MIME_TYPE} from '@cdf/express-middleware';
import {setVersionByAcceptHeader} from 'express-version-request';

// Start the server
const server = new InversifyExpressServer(container);

// log detected config
logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

// load in the supported versions
const supportedVersionConfig:SupportedVersionConfig = config.get('supportedApiVersions');
const supportedVersions:string[] = asArray(supportedVersionConfig);

server.setConfig((app) => {

    // only process requests that we can support the requested accept header
    app.use( (req:Request, _res:Response, next:NextFunction)=> {
        if (supportedVersions.includes(req.headers['accept'])) {
            next();
        } else {
            // res.status(415).send();
            // if not recognised, default to v1
            req.headers['accept'] = DEFAULT_MIME_TYPE;
            req.headers['content-type'] = DEFAULT_MIME_TYPE;
            next();
        }
    });
    app.use(bodyParser.json({ type: supportedVersions }));

    // extrapolate the version from the header and place on the request to make to easier for the controllers to deal with
    app.use(setVersionByAcceptHeader());

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
serverInstance.listen(3011);

logger.info('Server started on port 3011 :)');
