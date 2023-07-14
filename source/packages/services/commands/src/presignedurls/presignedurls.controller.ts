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
import { inject } from 'inversify';
import { controller, httpPost, interfaces, requestBody, response } from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { handleError } from '../utils/errors';
import { logger } from '../utils/logger';
import {
    PresignedDownloadRequestModel,
    PresignedResponseModel,
    PresignedUploadRequestModel,
} from './presignedurls.models';
import { PresignedUrlsService } from './presignedurls.service';

@controller('/mqtt/presignedurls')
export class PresignedUrlsController implements interfaces.Controller {
    constructor(
        @inject(TYPES.PresignedUrlsService) private presignedUrlService: PresignedUrlsService
    ) {}

    @httpPost('/uploads')
    public async generateForUpload(
        @requestBody() model: PresignedUploadRequestModel,
        @response() res: Response
    ): Promise<PresignedResponseModel> {
        logger.info(
            `presignedurls.controller  generateForUpload: in: model: ${JSON.stringify(model)}`
        );

        let r: PresignedResponseModel;
        try {
            r = await this.presignedUrlService.generateForUpload(model);
            res.status(201);
        } catch (e) {
            handleError(e, res);
        }
        return r;
    }

    @httpPost('/downloads')
    public async generateForDownloads(
        @requestBody() model: PresignedDownloadRequestModel,
        @response() res: Response
    ): Promise<PresignedResponseModel> {
        logger.info(
            `presignedurls.controller  generateForDownloads: in: model: ${JSON.stringify(model)}`
        );

        let r: PresignedResponseModel;
        try {
            r = await this.presignedUrlService.generateForDownload(model);
            res.status(201);
        } catch (e) {
            handleError(e, res);
        }
        return r;
    }
}
