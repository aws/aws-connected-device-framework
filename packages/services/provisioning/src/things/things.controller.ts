/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, requestBody, requestParam, httpPost, httpGet, httpDelete, httpPatch } from 'inversify-express-utils';
import { inject } from 'inversify';
import { ProvisionThingRequest, ProvisionThingResponse, ThingDetailModel, PatchCertificateRequest } from './things.models';
import { ThingsService } from './things.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import ow from 'ow';

@controller('/things')
export class ThingsController implements interfaces.Controller {

    constructor( @inject(TYPES.ThingsService) private thingsService: ThingsService) {}

    @httpPost('')
    public async provisionThing(@requestBody() request: ProvisionThingRequest, @response() res: Response) : Promise<ProvisionThingResponse> {
        logger.info(`things.controller provisionThing: in: request: ${JSON.stringify(request)}`);
        try {
            ow(request.provisioningTemplateId, ow.string.nonEmpty);

            const thing = await this.thingsService.provision(request.provisioningTemplateId, request.parameters, request.cdfProvisioningParameters);
            res.status(201);
            return thing;
        } catch (e) {
            handleError(e, res);
        }

        return null;
    }

    @httpGet('/:thingName')
    public async getThing(@requestParam('thingName') thingName: string, @response() res: Response): Promise<ThingDetailModel> {

        logger.info(`things.controller get: in: thingName: ${thingName}`);
        try {
            const model = await this.thingsService.getThing(thingName);
            logger.debug(`controller exit: ${JSON.stringify(model)}`);
            res.status(200).json(model);
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpDelete('/:thingName')
    public async deleteThing(@requestParam('thingName') thingName: string, @response() res: Response): Promise<void> {

        logger.info(`things.controller delete: in: thingName: ${thingName}`);
        try {
            const deleted = await this.thingsService.deleteThing(thingName);
            logger.debug(`controller exit: ${JSON.stringify(deleted)}`);
            res.status(204);
        } catch (e) {
            handleError(e, res);
        }
    }

    @httpPatch('/:thingName/certificates')
    public async updateThingCertificates(@requestParam('thingName') thingName: string, @requestBody() request: PatchCertificateRequest,
        @response() res: Response) : Promise<void> {

        logger.info(`things.controller updateThingCertificates: in: thingName:${thingName}, request:${JSON.stringify(request)}`);
        try {
            ow(request.certificateStatus, ow.string.nonEmpty);
            await this.thingsService.updateThingCertificatesStatus(thingName, request.certificateStatus);
            res.status(204);
        } catch (e) {
            handleError(e, res);
        }

    }
}
