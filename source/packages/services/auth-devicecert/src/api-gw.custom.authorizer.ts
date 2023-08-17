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
import * as Errors from '@awssolutions/cdf-errors';
import AWS from 'aws-sdk';
import * as pem from 'pem';
import { promisify } from 'util';
import { logger } from './utils/logger';

/**
 * Class implementing custom authorization needed by CDF APIs.
 * @type {ApiGwCustomAuthorizer}
 * @module api-gw-custom-auth
 */

export class ApiGwCustomAuthorizer {
    private _ssm: AWS.SSM;
    private caCert: string;

    private _verifySigningChain = promisify(pem.verifySigningChain);

    constructor(region: string, ssm?: AWS.SSM) {
        if (ssm !== undefined) {
            this._ssm = ssm;
        } else {
            this._ssm = new AWS.SSM({ region });
        }
    }

    private async validateCert(certificate: string, caCertificate: string[]): Promise<boolean> {
        return await this._verifySigningChain(certificate, caCertificate);
    }

    private async getCACertificateId(): Promise<string> {
        const params = {
            Name: 'cdf-rootca-pem',
            WithDecryption: true,
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
        const caCertArray: string[] = [this.caCert];
        const validCert = await this.validateCert(unescaped_deviceCert, caCertArray);
        logger.debug(`Device is Valid: ${validCert}`);
        return validCert;
    }
}
