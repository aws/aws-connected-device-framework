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
import { ProvisioningStepProcessor } from './provisioningstepprocessor';
import { ProvisioningStepInput, ProvisioningStepOutput } from './provisioningstep.model';
import { CDFProvisioningTemplate, ParamaterReference } from '../templates/template.models';
import { logger } from '../../utils/logger';
import * as util from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { TYPES } from '../../di/types';
import AWS = require('aws-sdk');

@injectable()
export class ClientIdEnforcementPolicyStepProcessor implements ProvisioningStepProcessor {

  private _readFileAsync = util.promisify(fs.readFile);
  private _clientIdEnforcementPolicyTemplate:string;

  private _iot: AWS.Iot;

  public constructor(
    @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    @inject('aws.region') private region: string,
    @inject('aws.accountId') private accountId: string) {

      this._iot = iotFactory();
  }

  public async process(stepInput: ProvisioningStepInput): Promise<ProvisioningStepOutput> {
    logger.debug(`things.steps.ClientIdEnforcementPolicyStepProcessor: process: in:`);

    if (stepInput.cdfProvisioningParameters === undefined || stepInput.cdfProvisioningParameters === null) {
        throw new Error('REGISTRATION_FAILED: ClientIdEnforcementPolicy Step Failed - cdfProvisioningParameters not provided');
    }

    if (stepInput.cdfProvisioningParameters.registered === undefined || stepInput.cdfProvisioningParameters.registered === null) {
      throw new Error('REGISTRATION_FAILED: ClientIdEnforcementPolicy Step Failed - Registred Device Parameter is missing');
    }

    if (stepInput.cdfProvisioningParameters.registered.resourceArns === undefined || stepInput.cdfProvisioningParameters.registered.resourceArns === null) {
        throw new Error('REGISTRATION_FAILED: ClientIdEnforcementPolicy Step Failed - certificate arn not provided');
    }

    const certificateArn: string = stepInput.cdfProvisioningParameters.registered.resourceArns['certificate'];

    await this.createClientIdEnforcementPolicy(stepInput.template, stepInput.parameters, certificateArn);

    const output: ProvisioningStepOutput = {
      parameters: stepInput.parameters,
      cdfProvisioningParameters: stepInput.cdfProvisioningParameters
    };

    return output;
  }

  private async createClientIdEnforcementPolicy(cdfTemplate: CDFProvisioningTemplate, parameters:{[key:string]:string}, certificateArn:string): Promise<void> {
    logger.debug(`things.steps.ClientIdEnforcementPolicyStepProcessor createClientIdEnforcementPolicy: in: certificateArn:${certificateArn}`);

    if (this._clientIdEnforcementPolicyTemplate===null || this._clientIdEnforcementPolicyTemplate===undefined) {
        const templateLocation = path.join(__dirname, `../policies/clientIdEnforcementPolicyTemplate.json`);
        this._clientIdEnforcementPolicyTemplate = await this._readFileAsync(templateLocation, {encoding: 'utf8'});
    }

    let thingName:string;
    if (typeof cdfTemplate.Resources.thing.Properties.ThingName === 'string') {
        logger.debug(`ThingName: string`);
        thingName = cdfTemplate.Resources.thing.Properties.ThingName as string;
    } else {
        logger.debug(`ThingName: ParamaterReference`);
        const parameter = (cdfTemplate.Resources.thing.Properties.ThingName as ParamaterReference).Ref;
        thingName = parameters[parameter];
    }

    const policyName = `clientIdEnforcementPolicy_${thingName}`;

    // check to see if this policy already exists
    logger.debug(`checking to see if policy ${policyName} exists`);
    const getPolicyParams: AWS.Iot.GetPolicyRequest =  {
        policyName
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
        .replace('${cdf:region}', this.region )
        .replace('${cdf:accountId}', this.accountId )
        .replace('${cdf:thingName}', thingName );

        logger.debug(`creating policy with params:  policyName:${policyName}, policyDocument:${JSON.stringify(policy)}`);

        // create device specific policy and associate it with the certificate
        const createPolicyParams: AWS.Iot.CreatePolicyRequest = {
            policyName,
            policyDocument: policy
        };
        await this._iot.createPolicy(createPolicyParams).promise();
    }

    // attach policy

    const attachPolicyParams: AWS.Iot.AttachPolicyRequest = {
        policyName,
        target: certificateArn
    };
    await this._iot.attachPolicy(attachPolicyParams).promise();

    logger.debug('things.steps.ClientIdEnforcementPolicyStepProcessor createClientIdEnforcementPolicy: exit:');
  }
}
