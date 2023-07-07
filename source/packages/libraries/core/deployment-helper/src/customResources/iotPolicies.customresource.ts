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

import { TYPES } from '../di/types';
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';
import { logger } from '../utils/logger';
import ow from 'ow';
import AWS from 'aws-sdk'

@injectable()
export class IotPoliciesCustomResource implements CustomResource {

    private _iot: AWS.Iot;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    ) {
        this._iot = iotFactory();
    }

    public async create(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`IotPoliciesCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);

        const policyName = customResourceEvent?.ResourceProperties?.PolicyName;
        const policyDocument = customResourceEvent?.ResourceProperties?.PolicyDocument;

        ow(policyName, ow.string.nonEmpty);
        ow(policyDocument, ow.string.nonEmpty);

        // see how many policy versions we have.  max 5 allowed
        let policies: AWS.Iot.ListPolicyVersionsResponse;

        try {
            policies =  await this._iot.listPolicyVersions({
                policyName
            }).promise();
        } catch (err) {
            if(err.code === 'ResourceNotFoundException') {
                policies = { policyVersions: []};
            }
        }
        const totalVersions = policies.policyVersions.length || 0;

        let res;
        if (totalVersions===0) {
            // if not exist, can go ahead and create...
            res = await this._iot.createPolicy({
                policyName,
                policyDocument
            }).promise();

        } else {

            // if we have too many, remove the oldest version
            if (policies.policyVersions?.length>=5) {
                const oldestPolicyVersionId:number = policies.policyVersions
                    .map(p=>parseInt(p.versionId,10))
                    .sort(function(a, b) { return a-b;})[0];
                await this._iot.deletePolicyVersion({
                    policyName,
                    policyVersionId: `${oldestPolicyVersionId}`
                }).promise();
            }

            // create new version
            res = await this._iot.createPolicyVersion({
                policyName,
                policyDocument,
                setAsDefault: true
            }).promise();
        }

        return {
            policyArn: res.policyArn,
            policyVersionId: res.policyVersionId,
            policyName
        };
    }

    public async update(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`IotPoliciesCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
       return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        return {};
    }
}
