/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, httpPost, requestBody, requestParam} from 'inversify-express-utils';
import {logger} from '../utils/logger';

import { inject } from 'inversify';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { CertificatesTaskService } from './certificatestask.service';
import { CertificateBatchRequest, TaskStatus, CertificateBatchTask } from './certificatestask.models';

@controller('/supplier')
export class SupplierCertificatesController implements interfaces.Controller {

    constructor( @inject(TYPES.CertificatesTaskService) private certificatesTaskService: CertificatesTaskService) {}

    @httpPost('/:supplierId/certificates')
    public async createSupplierCertificates(@requestParam('supplierId') supplierId:string, @requestBody() request: CertificateBatchRequest, @response() res: Response): Promise<CertificateBatchTask> {
        logger.debug(`certificates.controller createCertificates: in: request: ${JSON.stringify(request)}`);

        try {
            const taskId: string = await this.certificatesTaskService.createTask(request.quantity, supplierId);
            const taskResponse:CertificateBatchTask = {
                taskId,
                status: TaskStatus.IN_PROGRESS
            };

            res.location(`/certificates/${taskId}`);
            res.status(202);

            return taskResponse;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }
}
