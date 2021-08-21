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
    public async create(@requestBody() policy: PolicyModel, @response() res: Response) : Promise<void> {
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
    public async updatePolicy(@requestParam('policyId') policyId:string, @requestBody() policy:PolicyModel, @response() res:Response) : Promise<void> {

        logger.info(`policy.controller updatePolicy: in: policyId:${policyId}, policy:${JSON.stringify(policy)}`);
        try {
            policy.policyId = policyId;
            await this.policiesService.update(policy);
        } catch (e) {
            handleError(e,res);
        }
    }

    @httpDelete('/:policyId')
    public async deletePolicy(@response() res: Response, @requestParam('policyId') policyId: string) : Promise<void> {

        logger.info(`policy.controller deletePolicy: in: policyId: ${policyId}`);
        try {
            await this.policiesService.delete(policyId);
        } catch (e) {
            handleError(e,res);
        }
    }

}
