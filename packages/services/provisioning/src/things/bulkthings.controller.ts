/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, httpPost, httpGet, requestParam } from 'inversify-express-utils';
import { inject } from 'inversify';
import { BulkProvisionThingsRequest, BulkProvisionThingsResponse } from './things.models';
import { ThingsService } from './things.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import ow from 'ow';

@controller('/bulkthings')
export class BulkThingsController implements interfaces.Controller {

    constructor( @inject(TYPES.ThingsService) private thingsService: ThingsService) {}

    @httpPost('')
    public async bulkProvisionThings(@requestBody() request: BulkProvisionThingsRequest, @response() res: Response) : Promise<BulkProvisionThingsResponse> {
        logger.info(`bulkthings.controller bulkProvisionThings: in: request: ${JSON.stringify(request)}`);
        let result:BulkProvisionThingsResponse;
        try {
            ow(request.provisioningTemplateId, ow.string.nonEmpty);

            result = await this.thingsService.bulkProvision(request.provisioningTemplateId, request.parameters);
            res.status(201);
        } catch (e) {
            handleError(e, res);
        }

        logger.info(`bulkthings.controller bulkProvisionThings: exit: ${JSON.stringify(result)}`);
        return result;
    }

    @httpGet('/:taskId')
    public async getBulkProvisionTask(@requestParam('taskId') taskId: string, @response() res: Response): Promise<BulkProvisionThingsResponse> {
        logger.info(`bulkthings.controller getBulkProvisionTask: in: taskId: ${taskId}`);
        let result:BulkProvisionThingsResponse;
        try {
            result = await this.thingsService.getBulkProvisionTask(taskId);
            res.status(200).json(result);
        } catch (e) {
            handleError(e, res);
        }

        logger.info(`bulkthings.controller getBulkProvisionTask: exit: ${JSON.stringify(result)}`);
        return result;
    }

}
