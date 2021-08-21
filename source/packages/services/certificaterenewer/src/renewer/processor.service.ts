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
import { injectable, inject } from 'inversify';
import { logger } from '../utils/logger';
import { TYPES } from '../di/types';
import AWS = require('aws-sdk');
import { SqsRequestList } from './renewer.models';
import { DevicesService , ASSTLIBRARY_CLIENT_TYPES} from '@cdf/assetlibrary-client';
import { Device20Resource } from '@cdf/assetlibrary-client/dist';
import { PutObjectRequest } from 'aws-sdk/clients/s3';
import {
    AttachPolicyRequest,
    AttachThingPrincipalRequest,
    CreateKeysAndCertificateRequest,
    CreateKeysAndCertificateResponse,
    ListPrincipalPoliciesRequest,
    ListPrincipalPoliciesResponse
} from 'aws-sdk/clients/iot';
import {CertificateModel} from './certificates.models';
import {CertificatesDao} from './certificates.dao';
import DynamoDB from 'aws-sdk/clients/dynamodb';

@injectable()
export class ProcessorService {
    private iot: AWS.Iot;
    private s3: AWS.S3;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.CertificatesDao) private certsDao: CertificatesDao,
        @inject('aws.s3.certificates.bucket') private bucketName: string,
        @inject(ASSTLIBRARY_CLIENT_TYPES.DevicesService) private devices: DevicesService) {
        this.iot = iotFactory();
        this.s3 = s3Factory();
    }

    public async processNotification(sqsRequestList: SqsRequestList): Promise<void> {
        logger.debug(`ProcessorService : notification:${JSON.stringify(sqsRequestList)}`);
        logger.debug(`S3 Bucket Name: ${this.bucketName}`);
        for (const sqsRequest of sqsRequestList.sqsRequests) {
            // Verify the device is active
            const isDeviceActive:boolean = await this.isDeviceActive(sqsRequest.thingName);
            logger.debug(`isDeviceActive : ${isDeviceActive}`);
            if(isDeviceActive) {
                // Validate and renew certificate
                const certificateModel: CertificateModel = await this.createAndGetRenewedCertificate(sqsRequest.thingName, sqsRequest.certificateArn);
                logger.debug(`Thing Name: ${sqsRequest.thingName} - New Certificate: ${certificateModel.renewedCertificateArn}`);
                // Store the renewed certificates to S3 bucket
                await this.storeRenewedCertificate(certificateModel);
                // Associate policies to renewed certificate and attach to the thingName
                await this.attachRenewedCertificateToThing(certificateModel.expiringCertificateArn, certificateModel.renewedCertificateArn, sqsRequest.thingName);
            }
        }
    }

    private async isDeviceActive(thingName: string): Promise<boolean> {
        try {
            logger.debug(`thingName: ${thingName}`);
            const response: Device20Resource = await this.devices.getDeviceByID(thingName, false);
            logger.debug(`response: ${JSON.stringify(response)}`);
            logger.debug(`DeviceId: ${response.deviceId} - Status: ${response.state}`);
            return response.state === 'active';
        } catch (e) {
            logger.error(`ThingName: ${thingName} - Error occurred while reading device status from AssetLibrary : ${JSON.stringify(e)}`);
            return false;
        }
    }

    private async createAndGetRenewedCertificate(deviceName: string, expiringCertArn: string): Promise<CertificateModel> {
        const response:DynamoDB.GetItemOutput = await this.certsDao.get(expiringCertArn);
        logger.debug(`DynamoDB Response : ${JSON.stringify(response)}`);
        if (response.Item === undefined) {
            logger.debug('create new certificate');
            const createKeysAndCertificateResponse: CreateKeysAndCertificateResponse = await this.createThingCertificates();
            // Store the renewed certificateArn within database table for duplicate validation.
            const certificateModel: CertificateModel = {
                expiringCertificateArn: expiringCertArn,
                thingName: deviceName,
                renewedCertificateArn: createKeysAndCertificateResponse.certificateArn,
                renewedCertificateId: createKeysAndCertificateResponse.certificateId,
                renewedCertificatePem: createKeysAndCertificateResponse.certificatePem
            };
            await this.certsDao.save(certificateModel);
            return certificateModel;
        } else {
            const model = this.certsDao.buildCertificateModel(response.Item);
            logger.debug(`RenewedCertificateArn: ${JSON.stringify(model)}`);
            return model;
        }
    }

    private async createThingCertificates(): Promise<CreateKeysAndCertificateResponse> {
        try {
            logger.debug(`Create New Thing Certificate`);
            const createKeysAndCertificateRequest: CreateKeysAndCertificateRequest = {setAsActive: true};
            const response: CreateKeysAndCertificateResponse = await this.iot.createKeysAndCertificate(createKeysAndCertificateRequest).promise();
            return response;
        } catch (e) {
            logger.warn(`Error occurred while creating new thing certificates : ${JSON.stringify(e)}`);
            throw Error('Error occurred while creating new thing certificates');
        }
    }

    private async attachRenewedCertificateToThing(expiringCertificateArn: string, renewedCertificateArn: string, thingName:string): Promise<void> {
        try {
            logger.debug(`List the certificate policies`);
            const listPrincipalPoliciesRequest: ListPrincipalPoliciesRequest = {principal: expiringCertificateArn};
            const response: ListPrincipalPoliciesResponse = await this.iot.listPrincipalPolicies(listPrincipalPoliciesRequest).promise();
            // Attach the policies to the renewed certificate
            await this.attachPolicies(renewedCertificateArn, response.policies);
            // Attach the renewed certificate to the thingName
            await this.attachThingPrincipal(renewedCertificateArn, thingName);
        } catch (e) {
            logger.warn(`Error occurred while listing the policies : ${JSON.stringify(e)}`);
            throw Error('Error occurred while listing the policies');
        }
    }

    private async attachPolicies(renewedCertificateArn: string, policies: AWS.Iot.Policies): Promise<void> {
        try {
            logger.debug(`Attach All Policies`);
            for (const policy of policies) {
                const attachPolicyRequest: AttachPolicyRequest = {
                    target: renewedCertificateArn,
                    policyName: policy.policyName
                };
                await this.iot.attachPolicy(attachPolicyRequest).promise();
                logger.info(`Successfully Attached ${policy.policyName} with new principal`);
            }
        } catch (e) {
            logger.warn(`Error occurred while attaching the policies : ${JSON.stringify(e)}`);
            throw Error('Error occurred while attaching the policies');
        }
    }

    private async attachThingPrincipal(newCertificateArn: string, deviceName: string): Promise<void> {
        try {
            logger.debug(`Attach thing principal`);
            const attachThingPrincipalRequest: AttachThingPrincipalRequest = {
                principal: newCertificateArn,
                thingName: deviceName
            };
            await this.iot.attachThingPrincipal(attachThingPrincipalRequest).promise();
            logger.info(`Successfully Attached ${deviceName} with new principal`);
        } catch (e) {
            logger.warn(`Error occurred while attaching thing principal : ${JSON.stringify(e)}`);
            throw Error(`Error occurred while attaching thing principal`);
        }
    }

    private async storeRenewedCertificate(model:CertificateModel): Promise<void> {
        logger.debug(`Store Created Certificate`);
        const fileContent = model.renewedCertificatePem;
        if (model.renewedCertificateId !== undefined) {
            const fileName = `${model.renewedCertificateId}.pem`;
            const dateObject = new Date();
            const directoryName = `${dateObject.getFullYear()}/${dateObject.getMonth()+1}/${dateObject.getDate()}`;
            logger.debug(`Directory Name: ${directoryName}`);
            const filePath = `${directoryName}/${fileName}`;
            logger.debug(`filePath: ${filePath}`);
            const putObjectRequest: PutObjectRequest = {
                Body: fileContent,
                Bucket: this.bucketName,
                Key: filePath
            };
            await this.s3.putObject(putObjectRequest).promise();
        }
    }
}
