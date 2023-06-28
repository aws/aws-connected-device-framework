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
import { injectable } from 'inversify';
import { PolicyModel} from './policies.models';
import {logger} from '@awssolutions/simple-cdf-logger';
import { PoliciesService } from './policies.service';
import { NotSupportedError } from '../utils/errors';

@injectable()
export class PoliciesServiceLite implements PoliciesService {

    public async get(policyId:string): Promise<PolicyModel> {
        logger.debug(`policies.full.service get: in: policyId:${policyId}`);
        throw new NotSupportedError();
    }

    public async create(model: PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service create: in: model: ${JSON.stringify(model)}`);
        throw new NotSupportedError();
    }

    public async update(updated:PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service update: in: updated:${JSON.stringify(updated)}`);
        throw new NotSupportedError();
    }

    public async listInheritedByDevice(deviceId:string, type:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByDevice: in: deviceId:${deviceId}, type:${type}`);
        throw new NotSupportedError();
    }

    public async listInheritedByGroup(groupPaths:string[], type?:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByGroup: in: groupPaths:${groupPaths}, type:${type}`);
        throw new NotSupportedError();
    }

    public async listPolicies(type?:string, offset?:number, count?:number): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listPolicies: in: type:${type}, offset:${offset}, count:${count}`);
        throw new NotSupportedError();
    }

    public async delete(policyId: string) : Promise<void> {
        logger.debug(`policies.full.service delete: in: policyId: ${policyId}`);
        throw new NotSupportedError();
    }

}
