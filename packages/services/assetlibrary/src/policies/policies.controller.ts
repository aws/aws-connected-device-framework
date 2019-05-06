/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, httpPost, requestBody, httpGet, queryParam, httpPatch, requestParam, httpDelete } from 'inversify-express-utils';
import { inject } from 'inversify';
import { PolicyModel, PolicyListModel } from './policies.models';
import { PoliciesService } from './policies.service';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';

@controller('/policies')
export class PoliciesController implements interfaces.Controller {

    constructor( @inject(TYPES.PoliciesService) private policiesService: PoliciesService) {}

    @httpPost('')
    public async create(@requestBody() policy: PolicyModel, @response() res: Response) {
        logger.info(`policies.controller  create: in: policy: ${JSON.stringify(policy)}`);
        try {
            await this.policiesService.create(policy);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpGet('/inherited')
    public async listInheritedPolicies( @queryParam('deviceId') deviceId:string, @queryParam('groupPath') groupPaths:string[],
        @queryParam('type') type:string, @response() res:Response): Promise<PolicyListModel> {

        logger.info(`policies.controller getInheritedPolicies: in: deviceId:${deviceId}, type:${type}, groupPaths:${groupPaths}`);

        const r: PolicyListModel= {results:[]};

        try {

            let results: PolicyModel[]=[];
            if (deviceId) {
                results = await this.policiesService.listInheritedByDevice(deviceId, type);
            } else if (groupPaths) {
                results = await this.policiesService.listInheritedByGroup(groupPaths, type);
            } else {
                res.status(400);
            }

            if (results===undefined) {
                res.status(404);
            } else {
                r.results=results;
            }
        } catch (e) {
            handleError(e,res);
        }
        logger.debug(`controller exit: ${JSON.stringify(r)}`);
        return r;
    }

    @httpGet('')
    public async listPolicies(@queryParam('type') type:string, @queryParam('offset') offset:number, @queryParam('count') count:number,
        @response() res:Response): Promise<PolicyListModel> {

        logger.info(`policies.controller listPolicies: in: type:${type}, offset:${offset}, count:${count}`);
        const r: PolicyListModel= {results:[]};
        if (offset && count) {
            r.pagination = {
                offset,
                count
            };
        }

        try {
            const results = await this.policiesService.listPolicies(type, offset, count);
            r.results=results;
        } catch (e) {
            handleError(e,res);
        }
        return r;
    }

    @httpGet('/:policyId')
    public async getPolicy(@requestParam('policyId') policyId:string, @response() res:Response) : Promise<PolicyModel> {

        logger.info(`policy.controller getPolicy: in: policyId:${policyId}`);
        try {
            return await this.policiesService.get(policyId);
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpPatch('/:policyId')
    public async updatePolicy(@requestParam('policyId') policyId:string, @requestBody() policy:PolicyModel, @response() res:Response) {

        logger.info(`policy.controller updatePolicy: in: policyId:${policyId}, policy:${JSON.stringify(policy)}`);
        try {
            policy.policyId = policyId;
            await this.policiesService.update(policy);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:policyId')
    public async deletePolicy(@response() res: Response, @requestParam('policyId') policyId: string) {

        logger.info(`policy.controller deletePolicy: in: policyId: ${policyId}`);
        try {
            await this.policiesService.delete(policyId);
        } catch (e) {
            handleError(e,res);
        }
    }

}
