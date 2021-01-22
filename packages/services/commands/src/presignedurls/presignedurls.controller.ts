/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, httpPost, requestBody} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import { PresignedUploadRequestModel, PresignedDownloadRequestModel, PresignedResponseModel } from './presignedurls.models';
import {handleError} from '../utils/errors';
import { PresignedUrlsService } from './presignedurls.service';

@controller('/mqtt/presignedurls')
export class PresignedUrlsController implements interfaces.Controller {

    constructor( @inject(TYPES.PresignedUrlsService) private presignedUrlService: PresignedUrlsService) {}

    @httpPost('/uploads')
    public async generateForUpload(@requestBody() model: PresignedUploadRequestModel, @response() res: Response) : Promise<PresignedResponseModel> {
        logger.info(`presignedurls.controller  generateForUpload: in: model: ${JSON.stringify(model)}`);

        let r:PresignedResponseModel;
        try {
            r = await this.presignedUrlService.generateForUpload(model);
            res.status(201);

        } catch (e) {
            handleError(e,res);
        }
        return r;
    }

    @httpPost('/downloads')
    public async generateForDownloads(@requestBody() model: PresignedDownloadRequestModel, @response() res: Response) : Promise<PresignedResponseModel>  {
        logger.info(`presignedurls.controller  generateForDownloads: in: model: ${JSON.stringify(model)}`);

        let r:PresignedResponseModel;
        try {
            r = await this.presignedUrlService.generateForDownload(model);
            res.status(201);
        } catch (e) {
            handleError(e,res);
        }
        return r;
    }
}
