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
            let certInfo = {};
            if (typeof request.certInfo !== 'undefined') {
                certInfo = request.certInfo;
            }
            const taskId: string = await this.certificatesTaskService.createTask(request.quantity, supplierId,certInfo);
            const taskResponse:CertificateBatchTask = {
                taskId,
                status: TaskStatus.IN_PROGRESS
            };

            res.location(`/certificates/${taskId}`);
            res.header('x-taskid', taskId);
            res.status(202);

            return taskResponse;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }
}
