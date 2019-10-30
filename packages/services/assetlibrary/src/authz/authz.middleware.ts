
import { Request, Response, NextFunction } from 'express';
import { Claims } from './claims';
import * as als from 'async-local-storage';
import {logger} from '../utils/logger';
import {decode} from 'jsonwebtoken';

const JWT_HEADER = 'authorization';
const JWT_CLAIMS = 'cdf_al';
const CLAIMS_REQUEST_ATTRIBUTE = 'claims';

als.enable();

export function setClaims() {
    return (req: Request, res: Response, next: NextFunction) => {

        logger.debug(`authz.middleware setClaims in:${JSON.stringify(req.headers)}`);

        // decodes the JWT, extacts the claims, and serializes as an object in a ThreadLocal
        // to make it easier for the service/dao layers to obtain.

        // Note:  it is he responsibility of the custom authorizer to verify the incoming JWT
        logger.debug(JSON.stringify(req.headers));

        if (req && req.headers && req.headers[JWT_HEADER]) {
            const header = req.headers[JWT_HEADER] as string;
            const token = header.replace('Bearer ','');
            const decoded = decode(token);
            const claims_header = decoded[JWT_CLAIMS];

            logger.debug(JSON.stringify(decoded));

            const claims = new Claims(claims_header);

            logger.debug(`authz.middleware setClaims claims:${JSON.stringify(claims)}`);

            als.set(CLAIMS_REQUEST_ATTRIBUTE, claims);

            next();

        } else {
            res.sendStatus(403);
        }
    };
}
