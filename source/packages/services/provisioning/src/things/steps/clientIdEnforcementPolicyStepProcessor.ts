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
import { logger } from '@awssolutions/simple-cdf-logger';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { TYPES } from '../../di/types';
import { CDFProvisioningTemplate, ParamaterReference } from '../templates/template.models';
import { ProvisioningStepData } from './provisioningStep.model';
import { ProvisioningStepProcessor } from './provisioningStepProcessor';
import AWS = require('aws-sdk');

@injectable()
export class ClientIdEnforcementPolicyStepProcessor implements ProvisioningStepProcessor {
    private _clientIdEnforcementPolicyTemplate: string;

    private _iot: AWS.Iot;

    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject('aws.region') private region: string,
        @inject('aws.accountId') private accountId: string
    ) {
        this._iot = iotFactory();
    }

    public async process(stepData: ProvisioningStepData): Promise<void> {
        logger.debug(
            `things.steps.ClientIdEnforcementPolicyStepProcessor: process: in: stepData:${JSON.stringify(
                stepData
            )}`
        );

        const certificateArn: string = stepData.state?.arns?.certificate;
        ow(certificateArn, ow.string.nonEmpty);

        await this.createClientIdEnforcementPolicy(
            stepData.template,
            stepData.parameters,
            certificateArn
        );
        logger.debug(`things.steps.ClientIdEnforcementPolicyStepProcessor: process: exit:`);
    }

    private async createClientIdEnforcementPolicy(
        cdfTemplate: CDFProvisioningTemplate,
        parameters: { [key: string]: string },
        certificateArn: string
    ): Promise<void> {
        logger.debug(
            `things.steps.ClientIdEnforcementPolicyStepProcessor createClientIdEnforcementPolicy: in: certificateArn:${certificateArn}`
        );

        if (
            this._clientIdEnforcementPolicyTemplate === null ||
            this._clientIdEnforcementPolicyTemplate === undefined
        ) {
            const templateObject = await import(
                '../policies/clientIdEnforcementPolicyTemplate.json'
            );
            this._clientIdEnforcementPolicyTemplate = JSON.stringify(templateObject);
        }

        let thingName: string;
        if (typeof cdfTemplate.Resources.thing.Properties.ThingName === 'string') {
            logger.debug(`ThingName: string`);
            thingName = cdfTemplate.Resources.thing.Properties.ThingName as string;
        } else {
            logger.debug(`ThingName: ParamaterReference`);
            const parameter = (
                cdfTemplate.Resources.thing.Properties.ThingName as ParamaterReference
            ).Ref;
            thingName = parameters[parameter];
        }

        const policyName = `clientIdEnforcementPolicy_${thingName}`;

        // check to see if this policy already exists
        logger.debug(`checking to see if policy ${policyName} exists`);
        const getPolicyParams: AWS.Iot.GetPolicyRequest = {
            policyName,
        };

        let policyExists = false;

        try {
            await this._iot.getPolicy(getPolicyParams).promise();
            logger.debug(`policy ${policyName} exists`);
            policyExists = true;
        } catch (getPolicyError) {
            if (getPolicyError.code === 'ResourceNotFoundException') {
                logger.debug(`policy ${policyName} does not exists, will create`);
                policyExists = false;
            } else {
                logger.error(`Error getting policy ${policyName}`);
                throw getPolicyError;
            }
        }

        if (!policyExists) {
            // first create policy
            const policy = this._clientIdEnforcementPolicyTemplate
                .replace('${cdf:region}', this.region)
                .replace('${cdf:accountId}', this.accountId)
                .replace('${cdf:thingName}', thingName);

            logger.debug(
                `creating policy with params:  policyName:${policyName}, policyDocument:${JSON.stringify(
                    policy
                )}`
            );

            // create device specific policy and associate it with the certificate
            const createPolicyParams: AWS.Iot.CreatePolicyRequest = {
                policyName,
                policyDocument: policy,
            };
            await this._iot.createPolicy(createPolicyParams).promise();
        }

        // attach policy

        const attachPolicyParams: AWS.Iot.AttachPolicyRequest = {
            policyName,
            target: certificateArn,
        };
        await this._iot.attachPolicy(attachPolicyParams).promise();

        logger.debug(
            'things.steps.ClientIdEnforcementPolicyStepProcessor createClientIdEnforcementPolicy: exit:'
        );
    }
}
