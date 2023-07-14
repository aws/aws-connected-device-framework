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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Response } from 'express';
import {
    controller,
    httpGet,
    interfaces,
    queryParam,
    requestParam,
    response,
} from 'inversify-express-utils';

import * as fs from 'fs';
import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { CertificatesService } from './certificates.service';
import { CertificateBatchTaskWithChunks, TaskStatus } from './certificatestask.models';
import { CertificatesTaskService } from './certificatestask.service';

@controller('/certificates')
export class CertificatesController implements interfaces.Controller {
    constructor(
        @inject(TYPES.CertificatesTaskService)
        private certificatesTaskService: CertificatesTaskService,
        @inject(TYPES.CertificatesService) private certificatesService: CertificatesService
    ) {}

    @httpGet('/:taskId')
    public async getCertificates(
        @requestParam('taskId') taskId: string,
        @queryParam('downloadType') downloadType: string,
        @response() res: Response
    ): Promise<void> {
        logger.debug(`certificates.controller getCertificates: in: taskId:${taskId}`);

        try {
            const batchCertsTask: CertificateBatchTaskWithChunks =
                await this.certificatesTaskService.getTask(taskId);

            if (batchCertsTask.status === TaskStatus.COMPLETE) {
                // if its complete
                if (typeof downloadType !== 'undefined' && downloadType === 'signedUrl') {
                    // provide a list of signed urls
                    const signedUrls: string | string[] =
                        await this.certificatesService.getCertificates(taskId, 'signedUrl');
                    res.status(200);
                    res.send(signedUrls);
                } else {
                    // download it
                    const zipFilePath: string | string[] =
                        await this.certificatesService.getCertificates(taskId, 'zip');
                    const fileData: Buffer = fs.readFileSync(zipFilePath.toString());
                    res.type('application/zip'); // content-type
                    res.status(200);
                    res.send(fileData);
                }
            } else {
                // but if its not complete, redirect the client to the task
                const redirectTo = `/certificates/${taskId}/task`;
                logger.debug(
                    `certificates.controller getCertificates: exit: 303 to ${redirectTo}`
                );
                res.location(redirectTo);
                res.status(303);
            }
        } catch (e) {
            handleError(e, res);
        }

        logger.debug('certificates.controller getCertificates: exit: complete');
    }

    @httpGet('/:taskId/task')
    public async getCertificatesTask(
        @requestParam('taskId') taskId: string,
        @response() res: Response
    ): Promise<CertificateBatchTaskWithChunks> {
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
