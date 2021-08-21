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
