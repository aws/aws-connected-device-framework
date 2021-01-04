/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import * as Errors from '@cdf/errors';
import * as pem from 'pem';
import AWS = require('aws-sdk');
import { logger } from './utils/logger';
import {promisify} from 'util';

/**
 * Class implementing custom authorization needed by CDF APIs.
 * @type {ApiGwCustomAuthorizer}
 * @module api-gw-custom-auth
 */

export class ApiGwCustomAuthorizer {

    private _ssm:AWS.SSM;
    private caCert:string;

    private _verifySigningChain = promisify(pem.verifySigningChain);

    constructor(region:string, ssm?:AWS.SSM) {
        if (ssm!==undefined) {
            this._ssm = ssm;
        } else {
            this. _ssm = new AWS.SSM({region});
        }

    }

    private async validateCert(certificate:string, caCertificate:string[]) : Promise<boolean> {
        return await this._verifySigningChain(certificate, caCertificate);
    }

    private async getCACertificateId () : Promise<string> {
        const params = {
            Name: 'cdf-rootca-pem',
            WithDecryption: true
        };
        const res = await this._ssm.getParameter(params).promise();
        return res.Parameter?.Value;
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
