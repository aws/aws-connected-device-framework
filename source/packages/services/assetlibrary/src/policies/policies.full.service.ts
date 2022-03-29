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
import { injectable, inject } from 'inversify';
import { PolicyModel, AttachedPolicy} from './policies.models';
import { PoliciesAssembler} from './policies.assembler';
import { TYPES } from '../di/types';
import { PoliciesDaoFull} from './policies.full.dao';
import {logger} from '../utils/logger';
import {EventEmitter, Type, Event} from '../events/eventEmitter.service';
import { Operation, TypeCategory } from '../types/constants';
import ow from 'ow';
import { PoliciesService } from './policies.service';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';
import { SchemaValidationError } from '../utils/errors';

@injectable()
export class PoliciesServiceFull implements PoliciesService {

    constructor( 
        @inject(TYPES.EventEmitter) private eventEmitter: EventEmitter,
        @inject(TYPES.PoliciesAssembler) private policiesAssembler: PoliciesAssembler,
        @inject(TYPES.PoliciesDao) private policiesDao: PoliciesDaoFull,
        @inject(TYPES.SchemaValidatorService) private validator: SchemaValidatorService) {}

    private setIdsToLowercase(model:PolicyModel) {
        model.policyId = model.policyId.toLowerCase();
        if (model.type) {
            model.type = model.type.toLowerCase();
        }
        if (model.appliesTo) {
            model.appliesTo = model.appliesTo.map(v=> v.toLowerCase());
        }
    }

    public async get(policyId:string): Promise<PolicyModel> {
        logger.debug(`policies.full.service get: in: policyId:${policyId}`);

        ow(policyId,'policyId', ow.string.nonEmpty);

        // any ids need to be lowercase
        policyId=policyId.toString();

        const result  = await this.policiesDao.get(policyId);

        const model = this.policiesAssembler.toModelFromPolicy(result);
        logger.debug(`policies.full.service get: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public async create(policy: PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service create: in: model: ${JSON.stringify(policy)}`);

        ow(policy, ow.object.nonEmpty);
        ow(policy.policyId, ow.string.nonEmpty);
        ow(policy.type, ow.string.nonEmpty);
        ow(policy.document, ow.string.nonEmpty);
        ow(policy.appliesTo, ow.array.nonEmpty.minLength(1));

        // remove any non printable characters from the id
        policy.policyId = policy.policyId.replace(/[^\x20-\x7E]+/g, '');

        // any ids need to be lowercase
        this.setIdsToLowercase(policy);

        // schema validation
        const validate = await this.validator.validateType(TypeCategory.Policy, policy, Operation.CREATE);
        if (!validate.isValid) {
            throw new SchemaValidationError(validate);
        }

        // Save to datastore
        const id = await this.policiesDao.create(policy);

        // fire event
        await this.eventEmitter.fire({
            objectId: policy.policyId,
            type: Type.policy,
            event: Event.create,
            payload: JSON.stringify(policy)
        });

        logger.debug(`policies.full.service create: exit: id: ${id}`);
        return id;

    }

    public async update(updated:PolicyModel) : Promise<string> {
        logger.debug(`policies.full.service update: in: updated:${JSON.stringify(updated)}`);

        ow(updated, ow.object.nonEmpty);
        ow(updated.policyId, ow.string.nonEmpty);

        // any ids need to be lowercase
        this.setIdsToLowercase(updated);

        // Save to datastore
        const existingPolicy = await this.policiesDao.get(updated.policyId);
        const existingModel = this.policiesAssembler.toModelFromPolicy(existingPolicy);

        const id = await this.policiesDao.update(existingModel, updated);

        // fire event
        await this.eventEmitter.fire({
            objectId: updated.policyId,
            type: Type.policy,
            event: Event.modify,
            payload: JSON.stringify(updated)
        });

        logger.debug(`policies.full.service update: exit: id: ${id}`);
        return id;

    }

    public async listInheritedByDevice(deviceId:string, type:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByDevice: in: deviceId:${deviceId}, type:${type}`);

        ow(deviceId, 'deviceId', ow.string.nonEmpty);
        ow(type,'type', ow.string.nonEmpty);

        // any ids need to be lowercase
        deviceId=deviceId.toLowerCase();
        type=type.toLowerCase();

        const attached  = await this.policiesDao.listDeviceAttachedPolicies(deviceId, type);
        return this.filterAttached(attached);

    }

    public async listInheritedByGroup(groupPaths:string[], type?:string): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listInheritedByGroup: in: groupPaths:${groupPaths}, type:${type}`);

        ow(groupPaths, 'groupPaths',ow.array.nonEmpty.minLength(1));

        // any ids need to be lowercase
        groupPaths=groupPaths.map(v => v.toLowerCase());
        if (type!==undefined) {
            type=type.toLowerCase();
        }

        const attached  = await this.policiesDao.listGroupAttachedPolicies(groupPaths, type);
        return this.filterAttached(attached);

    }

    public async listPolicies(type?:string, offset?:number, count?:number): Promise<PolicyModel[]> {
        logger.debug(`policies.full.service listPolicies: in: type:${type}, offset:${offset}, count:${count}`);

        // any ids need to be lowercase
        if (type!==undefined) {
            type=type.toLowerCase();
        }

        const policies = await this.policiesDao.listPolicies(type, offset, count);
        return this.policiesAssembler.toModelFromPolicies(policies);

    }

    private filterAttached(attached:AttachedPolicy[]): PolicyModel[] {
        logger.debug(`policies.full.service filterAttached: in: attached:${JSON.stringify(attached)}`);

        // filter out the results so that we only end up with devices that are associated
        // with groups belongs to ALL the policies appliesTo groups
        const matches: AttachedPolicy[]=[];
        for(const policy of attached) {

            // sort both the paths to make it easier to compare with each other
            const groups: string[]=[];
            policy.groups.forEach(v=> groups.push(v.id));
            groups.sort();

            const policyGroups: string[]=[];
            policy.policyGroups.forEach(v=> policyGroups.push(v.id));
            policyGroups.sort();

            // start from the end of the list of policygroups (so that we can easily remove non matching), seeing if we have a match
            for(let pg = policyGroups.length -1; pg >= 0; pg--) {
                let matchFound=false;
                for(let dp = groups.length -1; dp >= 0; dp--) {
                    if (groups[dp].startsWith(policyGroups[pg])) {
                        // we have a match!
                        matchFound=true;
                        groups.splice(dp, 1);
                        break;
                    }
                }
                if (matchFound) {
                    policyGroups.splice(pg, 1);
                }
            }

            // if the policyGroups ends up containing no items, then we have a perfect match!
            if (policyGroups.length===0) {
                matches.push(policy);
            }
        }

        logger.debug(`policies.full.service filterAttached: matches: ${JSON.stringify(matches)}`);

        if (matches.length===0) {
            logger.debug(`policies.full.service filterAttached: exit: matches: undefined`);
            return undefined;
        }

        const models = this.policiesAssembler.toModelFromPolicies(matches);

        logger.debug(`policies.full.service filterAttached: exit: models: ${JSON.stringify(models)}`);
        return models;
    }

    public async delete(policyId: string) : Promise<void> {
        logger.debug(`policies.full.service delete: in: policyId: ${policyId}`);

        ow(policyId,'policyId', ow.string.nonEmpty);

        // any ids need to be lowercase
        policyId=policyId.toLowerCase();

        const policy = await this.get(policyId);

        // Save to datastore
        await this.policiesDao.delete(policyId);

        // fire event
        await this.eventEmitter.fire({
            objectId: policyId,
            type: Type.policy,
            event: Event.delete,
            payload: JSON.stringify(policy)
        });

        logger.debug(`policies.full.service delete: exit:`);

    }

}
