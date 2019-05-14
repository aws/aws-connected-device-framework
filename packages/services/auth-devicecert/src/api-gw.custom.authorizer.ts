/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import * as Errors from '@cdf/errors';
import * as pem from 'pem';
import AWS = require('aws-sdk');
import { logger } from './utils/logger';

/**
 * Class implementing custom authorization needed by CDF APIs.
 * @type {ApiGwCustomAuthorizer}
 * @module api-gw-custom-auth
 */

export class ApiGwCustomAuthorizer {

    private _ssm:AWS.SSM;
    private caCert:string;

    constructor(region:string, ssm?:AWS.SSM) {
        if (ssm!==undefined) {
            this._ssm = ssm;
        } else {
            this. _ssm = new AWS.SSM({region});
        }

    }

    private validateCert(certificate:string, caCertificate:string[]) : Promise<boolean> {
        return new Promise((resolve:any,reject:any) =>  {
            pem.verifySigningChain(certificate, caCertificate, (err:any, data:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve(data);
            });
        });
    }

    private getCACertificateId () : Promise<string> {
        return new Promise((resolve:any,reject:any) =>  {
            const params = {
                Name: 'cdf-rootca-pem',
                WithDecryption: true
            };
            this. _ssm.getParameter(params, (err:any, data:any) => {
                if (err) {
                    return reject(err);
                }
                // TODO: handle case with multiple registered CAs
                //       possibly will need to pass in desired CA id
                const caKey = data.Parameter.Value;
                return resolve(caKey);
            });
        });
    }

    /**
     * Authorize API Request for supplied deviec certificate
     * @param deviceCert of device
     * @return {Promise} of authorizeApiResponse object
     */
    public async authorizeApiRequestForCert(deviceCert: string): Promise<boolean> {
        if (!deviceCert) {
            throw new Errors.InvalidArgumentError('deviceCert is required');
        }
        const unescaped_deviceCert = deviceCert.replace(/\\r\\n/g, '\r\n').replace(/\\/g, '');

        logger.debug(`Validate the device certificate: ${unescaped_deviceCert}`);
        if (this.caCert === null || this.caCert === undefined) {
            this.caCert = await this.getCACertificateId();
        }
        const caCertArray:string[] = [this.caCert];
        const validCert = await this.validateCert(unescaped_deviceCert, caCertArray);
        logger.debug(`Device is Valid: ${validCert}`);
        return validCert;
    }
}
