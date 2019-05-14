/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import { PolicyModel} from './policies.models';
import {logger} from '../utils/logger';
import { PoliciesService } from './policies.service';

@injectable()
export class PoliciesServiceLite implements PoliciesService {

    public async get(policyId:string): Promise<PolicyModel> {
        logger.debug(`policies.full.service get: in: policyId:${policyId}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async create(model: PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service create: in: model: ${JSON.stringify(model)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async update(updated:PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service update: in: updated:${JSON.stringify(updated)}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async listInheritedByDevice(deviceId:string, type:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByDevice: in: deviceId:${deviceId}, type:${type}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async listInheritedByGroup(groupPaths:string[], type?:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByGroup: in: groupPaths:${groupPaths}, type:${type}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async listPolicies(type?:string, offset?:number, count?:number): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listPolicies: in: type:${type}, offset:${offset}, count:${count}`);
        throw new Error('NOT_SUPPORTED');
    }

    public async delete(policyId: string) : Promise<void> {
        logger.debug(`policies.full.service delete: in: policyId: ${policyId}`);
        throw new Error('NOT_SUPPORTED');
    }

}
