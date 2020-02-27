/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger';
import {verify} from 'jsonwebtoken';
import config from 'config';
import axios from 'axios';
import * as jwkToBuffer from 'jwk-to-pem';
import ow from 'ow';

export interface ClaimVerifyRequest {
    readonly token?: string;
}

export interface ClaimVerifyResult {
    readonly userName: string;
    readonly clientId: string;
    readonly isValid: boolean;
    readonly error?: any;
}

export class ApiGwCustomAuthorizer {

    private cognitoIssuer:string;
    private publicKeys:MapOfKidToPublicKey;

    constructor() {
        this.cognitoIssuer = config.get('token.issuer') as string;
        if (this.cognitoIssuer===undefined) {
            throw new Error('Token Issuer must be defined');
        }
    }

    private async getPublicKeys() : Promise<MapOfKidToPublicKey> {
        const url = `${this.cognitoIssuer}/.well-known/jwks.json`;
        const publicKeys = await axios.get<PublicKeys>(url);
        const cacheKeys = publicKeys.data.keys.reduce((agg, current) => {
            const rsa:jwkToBuffer.RSA = {
                kty: 'RSA',
                e: current.e,
                n: current.n
            };
            const pem = jwkToBuffer.default(rsa);
            agg[current.kid] = {instance: current, pem};
            return agg;
        }, {} as MapOfKidToPublicKey);

        logger.debug(`api-gw.custom.authorizer: getPublicKeys: cacheKeys:${JSON.stringify(cacheKeys)}`);
        return cacheKeys;
    }

    public async verify(request: ClaimVerifyRequest): Promise<ClaimVerifyResult> {
        logger.debug(`api-gw.custom.authorizer: verify: in: request:${JSON.stringify(request)}`);

        let result:ClaimVerifyResult;

        try {

            if (this.publicKeys===undefined || this.publicKeys===null) {
                this.publicKeys = await this.getPublicKeys();
            }

            ow(request, ow.object.nonEmpty);
            const token = request.token;
            ow(token, ow.string.nonEmpty);
            const tokenSections = (token || '').split('.');
            ow(tokenSections.length, ow.number.equal(3));

            const headerJSON = Buffer.from(tokenSections[0], 'base64').toString('utf8');
            const header = JSON.parse(headerJSON) as TokenHeader;
            const key = this.publicKeys[header.kid];
            if (key === undefined) {
                throw new Error('claim made for unknown kid');
            }

            const claim = verify(token, key.pem) as Claim;
            const currentSeconds = Math.floor( (new Date()).valueOf() / 1000);
            if (currentSeconds > claim.exp || currentSeconds < claim.auth_time) {
                throw new Error('claim is expired or invalid');
            }

            if (claim.iss !== this.cognitoIssuer) {
                throw new Error('claim issuer is invalid');
            }

            if (claim.token_use !== 'id') {
                throw new Error('claim use is not access');
            }

            result = {userName: claim.username, clientId: claim.client_id, isValid: true};
        } catch (error) {
          logger.error(`api-gw.custom.authorizer: verify: error:${error}`);
          result = {userName: '', clientId: '', error, isValid: false};
        }

        logger.debug(`api-gw.custom.authorizer: verify: exist:${JSON.stringify(result)}`);
        return result;
    }
}

interface TokenHeader {
    kid: string;
    alg: string;
}
interface PublicKey {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
}
interface PublicKeyMeta {
    instance: PublicKey;
    pem: string;
}
interface PublicKeys {
    keys: PublicKey[];
}
interface MapOfKidToPublicKey {
    [key: string]: PublicKeyMeta;
}
interface Claim {
    token_use: string;
    auth_time: number;
    iss: string;
    exp: number;
    username: string;
    client_id: string;
  }
