/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import { injectable } from 'inversify';
import { PolicyModel, AttachedPolicy, Policy} from './policies.models';
import {logger} from '../utils/logger';

@injectable()
export class PoliciesAssembler {

    public toModelFromTraverser(result: process.Traverser, labels: string[]): PolicyModel {
        logger.debug(`policies.assembler toModelFromTraverser: in: result: ${result}, labels: ${labels}`);

        const model = new PolicyModel();
        Object.keys(result).forEach( key => {
            if (key==='policyId') {
                model.policyId = <string> result[key];
            } else if (key==='type') {
                model.type = <string> result[key];
            } else if (key==='description') {
                model.description = <string> result[key];
            } else if (key==='appliesTo') {
                model.appliesTo = <string[]> result[key];
            } else if (key==='document') {
                model.document = <string> result[key];
            }
        });

        logger.debug(`policies.assembler toModelFromTraverser: exit: model: ${model}`);
        return model;
    }

    public toModelFromPolicy(policy: Policy | AttachedPolicy): PolicyModel {
        logger.debug(`policies.assembler toModelFromPolicy: in: policy: ${JSON.stringify(policy)}`);

        if (policy===undefined) {
            logger.debug(`policies.assembler toModelFromPolicy: exit: model: undefined`);
            return undefined;
        }

        const model = new PolicyModel();
        model.policyId=policy.policy.policyId[0];
        model.type = policy.policy.type[0];
        if (policy.policy.description) {
            model.description = policy.policy.description[0];
        }
        model.document = policy.policy.document[0];

        if ((policy as AttachedPolicy).policyGroups) {
            (policy as AttachedPolicy).policyGroups.forEach(pg=> {
                const idParts = pg.id.split('___');
                model.appliesTo.push(idParts[idParts.length-1]);
            });
        } else {
            policy.groups.forEach(pg=> {
                const idParts = pg.id.split('___');
                model.appliesTo.push(idParts[idParts.length-1]);
            });
        }

        logger.debug(`policies.assembler toModelFromPolicy: exit: model: ${JSON.stringify(model)}`);
        return model;
    }

    public toModelFromPolicies(policies: (AttachedPolicy|Policy)[]): PolicyModel[] {
        logger.debug(`policies.assembler toModelFromPolicies: in: policies: ${JSON.stringify(policies)}`);

        const models: PolicyModel[]=[];
        for(const policy of policies) {
            models.push(this.toModelFromPolicy(policy));
        }

        logger.debug(`policies.assembler toModelFromMatches: exit: models: ${JSON.stringify(models)}`);
        return models;
    }

}
