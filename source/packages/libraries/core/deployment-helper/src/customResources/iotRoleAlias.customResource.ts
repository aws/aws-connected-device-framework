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

@injectable()
export class IotRoleAliasCustomResource implements CustomResource {

    private _iot: AWS.Iot;

    constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
    ) {
        this._iot = iotFactory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(`IotRoleAliasCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);

        const tokenExchangeRoleNameArn = customResourceEvent?.ResourceProperties?.TokenExchangeRoleNameArn;
        const tokenExchangeRoleAlias = customResourceEvent?.ResourceProperties?.TokenExchangeRoleAlias;

        const tokenExchangeRolePolicy = `${tokenExchangeRoleAlias}-policy`

        try {
            ow(tokenExchangeRoleNameArn, ow.string.nonEmpty);
            ow(tokenExchangeRoleAlias, ow.string.nonEmpty);

            try {
                await this._iot.deletePolicy({ policyName: tokenExchangeRolePolicy }).promise();
            } catch (Exception) {
                logger.error(`IotRoleAliasCustomResource: create: error: cannot delete policy: ${Exception}`)
            }

            try {
                await this._iot.deleteRoleAlias({ roleAlias: tokenExchangeRoleAlias }).promise()
            } catch (Exception) {
                logger.error(`IotRoleAliasCustomResource: create: error: cannot delete existing role alias: ${Exception}`)
            }

            const createRoleAliasResult = await this._iot.createRoleAlias({
                roleAlias: tokenExchangeRoleAlias,
                roleArn: tokenExchangeRoleNameArn
            }).promise()

            const roleAliasArn = createRoleAliasResult.roleAliasArn

            logger.info(`IotRoleAliasCustomResource: role: ${roleAliasArn} is created`)

            await this._iot.createPolicy({
                policyName: tokenExchangeRolePolicy,
                policyDocument: JSON.stringify({
                    "Version": "2012-10-17",
                    "Statement": [
                        {
                            "Effect": "Allow",
                            "Action": "iot:AssumeRoleWithCertificate",
                            "Resource": roleAliasArn
                        }
                    ]
                })
            }).promise()

            logger.info(`IotRoleAliasCustomResource: policy: ${tokenExchangeRolePolicy} is created`)
            return {};

        } catch (err) {
            logger.error(`IotRoleAliasCustomResource: error: ${JSON.stringify(err)}`)
            return {}
        }
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(`IotRoleAliasCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }
}
