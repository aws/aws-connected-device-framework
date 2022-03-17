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
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { Claims } from './claims';
import * as als from 'async-local-storage';
import {logger} from '../utils/logger';
import {decode} from 'jsonwebtoken';

const JWT_HEADER = 'authorization';
const JWT_CLAIMS = 'cdf_al';
const CLAIMS_REQUEST_ATTRIBUTE = 'claims';

als.enable();

export function setClaims() : RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {

        logger.debug(`authz.middleware setClaims in:`);

        // decodes the JWT, extracts the claims, and serializes as an object in a ThreadLocal
        // to make it easier for the service/dao layers to obtain.

        // Note:  it is he responsibility of the custom authorizer to verify the incoming JWT

        if (req?.['headers']?.[JWT_HEADER]) {
            const header = req['headers'][JWT_HEADER] as string;

            try {
                const token = header.replace('Bearer ','');
                const decoded = decode(token);
                logger.debug(`authz.middleware decoded: ${JSON.stringify(decoded)}`);
                
                let claims_header = decoded[JWT_CLAIMS];

                // Check if the claims are passed as string and if so, parse the string as JSON
                if(typeof claims_header === 'string') {
                    claims_header = JSON.parse(claims_header);
                }

                const claims = new Claims(claims_header);

                logger.debug(`authz.middleware setClaims claims:${JSON.stringify(claims)}`);

                als.set(CLAIMS_REQUEST_ATTRIBUTE, claims);

                next();
            } catch (ex) {
                logger.warn(`authz.middleware setClaims failed to parse claims:${JSON.stringify(header)}`);
                res.sendStatus(403);
            }

        } else {
            res.sendStatus(403);
        }
    };
}
