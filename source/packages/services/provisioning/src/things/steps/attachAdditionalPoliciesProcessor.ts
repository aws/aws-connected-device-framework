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
import { ProvisioningStepProcessor } from './provisioningStepProcessor';
import { ProvisioningStepData } from './provisioningStep.model';
import { logger } from '../../utils/logger';
import { TYPES } from '../../di/types';
import AWS from 'aws-sdk'
import ow from 'ow';
import {generate} from 'shortid';


@injectable()
export class AttachAdditionalPoliciesProcessor implements ProvisioningStepProcessor {

  private _iot: AWS.Iot;

  public constructor(
    @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {

      this._iot = iotFactory();
  }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(`attachAdditionalPoliciesProcessor: process: in: stepInput: ${JSON.stringify(stepData)}`);

        const policies = stepData?.template?.CDF?.attachAdditionalPolicies;
        ow(policies, ow.array.minLength(1));
        for (const p of policies) {
            ow(p, 'policy', ow.object.nonEmpty);
            ow(p.name, 'policy name', ow.string.nonEmpty);
        }
        const certificateArn = stepData.state?.arns?.certificate;
        ow(certificateArn, ow.string.nonEmpty);

        for (const p of policies) {
            let policyName = p.name;
            if (p.document!==undefined) {
                policyName += `_${generate()}`;
                logger.debug(`attachAdditionalPoliciesProcessor: process: creating policy: ${policyName}`);
                await this._iot.createPolicy({
                    policyName,
                    policyDocument: p.document
                }).promise();
            }
            logger.debug(`attachAdditionalPoliciesProcessor: process: attaching policy: ${policyName} to target: ${certificateArn}`);
            await this._iot.attachPolicy({
                policyName,
                target: certificateArn
            }).promise();
        }

        logger.debug('attachAdditionalPoliciesProcessor: process: exit:');
    }

}
