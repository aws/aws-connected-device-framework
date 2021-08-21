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
import { CertificateModel } from './certificates.models';
import {DocumentClient} from 'aws-sdk/lib/dynamodb/document_client';
import AWS = require('aws-sdk');

@injectable()
export class CertificatesDao {

    private db: AWS.DynamoDB.DocumentClient;

    public constructor(
        @inject(TYPES.DocumentClientFactory) documentClientFactory: () => AWS.DynamoDB.DocumentClient,
        @inject('aws.dynamoDb.tables.certificates') private certsTable: string) {
        this.db = documentClientFactory();
    }

    /**
     * write certificateArn Information to DynamoDB table
     */
    public async save(model: CertificateModel): Promise<void> {
        logger.debug(`Certificate Table Name: ${this.certsTable}`);
        logger.debug(`Certificate Model: ${JSON.stringify(model)}`);
        const params: DocumentClient.PutItemInput = {
            TableName: this.certsTable,
            Item: {
                expiringCertificateArn: model.expiringCertificateArn,
                thingName: model.thingName,
                renewedCertificateArn: model.renewedCertificateArn
            }
        };
        logger.debug(`Certificate Model params:${JSON.stringify(params)}`);
        await this.db.put(params).promise();
        logger.debug(`successfully stored the certificate record`);
    }

    /**
     * Read certificateArn Information from DynamoDB table
     */
    public async get(expiringCertArn: string): Promise<DocumentClient.GetItemOutput> {
        logger.debug(`expiringCertificateArn :${expiringCertArn}`);
        const params = {
            TableName: this.certsTable,
            Key: {
                expiringCertificateArn: expiringCertArn
            }
        };
        const response:DocumentClient.GetItemOutput = await this.db.get(params).promise();
        return response;
    }

    public buildCertificateModel(item: DocumentClient.AttributeMap) : CertificateModel {
        const model = {
            expiringCertificateArn: item['expiringCertificateArn'],
            thingName: item['thingName'],
            renewedCertificateArn: item['renewedCertificateArn'],
            renewedCertificateId: item['renewedCertificateId'],
            renewedCertificatePem: item['renewedCertificatePem']
        };
        return model;
    }
}
