/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {v1 as uuid} from 'uuid';
import AWS = require('aws-sdk');
import { TYPES } from '../di/types';
import ow from 'ow';
import { CertificatesTaskDao } from './certificatestask.dao';
import { TaskStatus, CertificateBatchTaskWithChunks } from './certificatestask.models';
import { CertificateChunkRequest } from './certificates.models';
import { SNS } from 'aws-sdk';

@injectable()
export class CertificatesTaskService {

    private _sns: AWS.SNS;

    public constructor(@inject('events.request.topic') private requestTopic: string,
                        @inject('deviceCertificateInfo.commonName') private commonName: string,
                        @inject('deviceCertificateInfo.organization') private organization: string,
                        @inject('deviceCertificateInfo.organizationalUnit') private organizationalUnit: string,
                        @inject('deviceCertificateInfo.locality') private locality: string,
                        @inject('deviceCertificateInfo.stateName') private stateName: string,
                        @inject('deviceCertificateInfo.country') private country: string,
                        @inject('deviceCertificateInfo.emailAddress') private emailAddress: string,
                        @inject('deviceCertificateInfo.distinguishedNameQualifier') private distinguishedNameQualifier: string,
                        @inject('deviceCertificateInfo.serialNumber') private serialNumber: string,
                        @inject('deviceCertificateInfo.id') private id: string,
                        @inject('defaults.chunkSize') private defaultChunkSize: number,
                        @inject(TYPES.CertificatesTaskDao) private dao: CertificatesTaskDao,
                        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
        this._sns  =  snsFactory();
    }

    public async createTask(quantity:number, caAlias:string) : Promise<string> {
        logger.debug(`certificatestask.service createTask: in: quantity: ${quantity}, caAlias: ${caAlias}`);

        ow(quantity, ow.number.greaterThan(0));
        ow(caAlias, ow.string.nonEmpty);

        // determine number of chunks
        const remainder = quantity % this.defaultChunkSize;
        const quotient = Math.floor(quantity/this.defaultChunkSize);
        const numberOfChunks = remainder > 0 ? quotient + 1 : quotient;
        logger.debug(`numberOfChunks: ${numberOfChunks}`);

        // generate task ID
        const taskID:string = uuid();

        // capture batch date/time
        const batchDate:number = Date.now();

        // loop over the chunkSize
        for (let i=1; i<=numberOfChunks; ++i) {
            let chunkQuantity = Number(this.defaultChunkSize);
            if (i === numberOfChunks && remainder !== 0) {
                chunkQuantity = remainder;
            }
            await this.dao.saveChunk(taskID, i, chunkQuantity, TaskStatus.PENDING, batchDate);
            await this.fireSNSevent(taskID, i, chunkQuantity, caAlias);
        }

        logger.debug(`certificatestask.service createTask: exit: ${taskID}`);
        return taskID;
    }

    /**
     * fire a SNS event to another instance of bulkcerts
     */
    private async fireSNSevent(taskId:string, chunkId:number, quantity:number, caAlias:string) : Promise<void> {
        logger.debug(`certificatestask.service fireSNSevent: in: taskId:${taskId}, chunkId:${chunkId}, quantity:${quantity}`);

        ow(taskId, ow.string.nonEmpty);
        ow(chunkId, ow.number.greaterThan(0));
        ow(quantity, ow.number.greaterThan(0));

        const msg:CertificateChunkRequest = {
            certInfo:{
                commonName: this.commonName,
                organization: this.organization,
                organizationalUnit: this.organizationalUnit,
                locality: this.locality,
                stateName: this.stateName,
                country: this.country,
                emailAddress: this.emailAddress,
                distinguishedNameQualifier: this.distinguishedNameQualifier,
                serialNumber: this.serialNumber,
                id: this.id
            },
            taskId,
            chunkId,
            quantity,
            caAlias
        };
        const params:SNS.Types.PublishInput = {
            Subject: 'CreateChunk',
            Message: JSON.stringify(msg),
            TopicArn: this.requestTopic
        };
        logger.debug(`certificatestask.service fireSNSevent: publishing:${JSON.stringify(params)}`);
        await this._sns.publish(params).promise();
        logger.debug('certificatestask.service fireSNSevent: exit:');
    }

    public async getTask(taskId:string) : Promise<CertificateBatchTaskWithChunks> {
        logger.debug(`certificatestask.service getTask: in: taskId: ${taskId}`);

        ow(taskId, ow.string.nonEmpty);

        const task = await this.dao.getTask(taskId);
        if (task===undefined) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`certificatestask.service getTask: exit: ${JSON.stringify(task)}`);
        return task;
    }

}
