/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestParam, httpGet} from 'inversify-express-utils';
import {logger} from '../utils/logger';

import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { CertificatesTaskService } from './certificatestask.service';
import * as fs from 'fs';
import { TaskStatus, CertificateBatchTaskWithChunks } from './certificatestask.models';
import { CertificatesService } from './certificates.service';

@controller('/certificates')
export class CertificatesController implements interfaces.Controller {

    constructor( @inject(TYPES.CertificatesTaskService) private certificatesTaskService: CertificatesTaskService,
        @inject(TYPES.CertificatesService) private certificatesService: CertificatesService) {}

    @httpGet('/:taskId')
    public async getCertificates(@requestParam('taskId') taskId: string, @response() res: Response): Promise<any> {

        logger.debug(`certificates.controller getCertificates: in: taskId:${taskId}`);

        try {

            const batchCertsTask: CertificateBatchTaskWithChunks = await this.certificatesTaskService.getTask(taskId);

            if (batchCertsTask.status===TaskStatus.COMPLETE) {
                // if its complete, download it
                const zipFilePath:string = await this.certificatesService.getCertificates(taskId);
                const fileData:Buffer = fs.readFileSync(zipFilePath);
                res.type('application/zip');    // content-type
                res.status(200);
                res.send(fileData);
            } else {
                // but if its not complete, redirect the client to the task
                const redirectTo = `/certificates/${taskId}/task`;
                logger.debug(`certificates.controller getCertificates: exit: 303 to ${redirectTo}`);
                res.location(redirectTo);
                res.status(303);
            }

        } catch (e) {
            handleError(e, res);
        }

        logger.debug('certificates.controller getCertificates: exit: complete');
    }

    @httpGet('/:taskId/task')
    public async getCertificatesTask(@requestParam('taskId') taskId: string, @response() res: Response): Promise<CertificateBatchTaskWithChunks> {

        logger.debug(`certificates.controller getCertificatesTask: in: taskId:${taskId}`);

        let taskInfo: CertificateBatchTaskWithChunks;
        try {
            taskInfo = await this.certificatesTaskService.getTask(taskId);
            res.status(200);
        } catch (e) {
            handleError(e, res);
        }
        logger.debug(`certificates.controller getTask: exit: ${taskInfo}`);
        return taskInfo;
    }

}
