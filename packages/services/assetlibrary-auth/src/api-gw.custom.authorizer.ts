/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import * as Errors from '@cdf/errors';
import AWS = require('aws-sdk');
import {verify} from 'jsonwebtoken';

const SSM_KEY = 'cdf-assetlibrary-auth-shared-secret';

export class ApiGwCustomAuthorizer {

    private ssm:AWS.SSM;
    private jwtSecret:string;

    constructor(region:string, ssm?:AWS.SSM) {
        if (ssm!==undefined) {
            this.ssm = ssm;
        } else {
            this.ssm = new AWS.SSM({region});
        }
    }

    private getJwtSecret () : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            const params = {
                Name: SSM_KEY,
                WithDecryption: true
            };
            this.ssm.getParameter(params, (err:any, data:any) => {
                if (err) {
                    return reject(err);
                }
                const sharedSecret = data.Parameter.Value;
                return resolve(sharedSecret);
            });
        });
    }

    public async verify(token: string): Promise<boolean> {
        if (!token) {
            throw new Errors.InvalidArgumentError('token is required');
        }

        if (this.jwtSecret===undefined || this.jwtSecret===null) {
            this.jwtSecret = await this.getJwtSecret();
        }

        let isAuthorized = false;
        try {
            verify(token, this.jwtSecret);
            isAuthorized=true;
        } catch (err) {
            // do nothing not authorized
        }

        return isAuthorized;
    }
}
