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
import { inject, injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import Iot, { AuditCheckConfigurations } from 'aws-sdk/clients/iot';
import ow from 'ow';
import { TYPES } from '../di/types';
import { CustomResource } from './customResource';
import { CustomResourceEvent } from './customResource.model';

@injectable()
export class IotDeviceDefenderCustomResource implements CustomResource {
    private _iot: AWS.Iot;

    constructor(@inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        this._iot = iotFactory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `IotDeviceDefenderSettingCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const roleArn = customResourceEvent.ResourceProperties.RoleArn;
        const targetArn = customResourceEvent.ResourceProperties.TargetArn;
        const targetRoleArn = customResourceEvent.ResourceProperties.TargetRoleArn;
        const targetEnabled = customResourceEvent.ResourceProperties.TargetEnabled;
        const auditCheckEnabled = customResourceEvent.ResourceProperties.AuditCheckEnabled;
        logger.debug(
            `roleArn - ${roleArn}, targetArn - ${targetArn}, targetRoleArn -${targetRoleArn}, targetEnabled -${targetEnabled}, auditCheckEnabled -${auditCheckEnabled}`,
        );
        ow(roleArn, ow.string.nonEmpty);
        ow(targetArn, ow.string.nonEmpty);
        ow(targetRoleArn, ow.string.nonEmpty);
        const auditEnabled = auditCheckEnabled === 'true';
        const auditCheckConfigurations: AuditCheckConfigurations = {
            DEVICE_CERTIFICATE_EXPIRING_CHECK: {
                enabled: auditEnabled,
            },
        };
        const targetEnabledBoolean = targetEnabled === 'true';
        const auditNotificationTargetConfigurations: Iot.AuditNotificationTargetConfigurations = {
            SNS: {
                targetArn,
                roleArn: targetRoleArn,
                enabled: targetEnabledBoolean,
            },
        };
        const params: AWS.Iot.Types.UpdateAccountAuditConfigurationRequest = {
            roleArn,
            auditCheckConfigurations,
            auditNotificationTargetConfigurations,
        };
        logger.debug(`auditNotification Params: ${JSON.stringify(params)}`);
        const result: AWS.Iot.Types.UpdateAccountAuditConfigurationResponse = await this._iot
            .updateAccountAuditConfiguration(params)
            .promise();
        logger.debug(`IotThingTypeCustomResource: create: exit: ${JSON.stringify(result)}`);

        const describeScheduledAuditRequestParams: AWS.Iot.Types.DescribeScheduledAuditRequest = {
            scheduledAuditName: 'CertificateRenewerAudit',
        };
        let resourceExists = false;
        try {
            const describeScheduledAuditResponse: AWS.Iot.Types.DescribeScheduledAuditResponse =
                await this._iot
                    .describeScheduledAudit(describeScheduledAuditRequestParams)
                    .promise();
            resourceExists = true;
            logger.debug(
                `describeScheduledAuditResponse: ${JSON.stringify(
                    describeScheduledAuditResponse,
                )}`,
            );
        } catch (err) {
            if (err.name === 'ResourceNotFoundException') {
                resourceExists = false;
            } else {
                throw err;
            }
        }

        if (resourceExists === true) {
            const auditParams: AWS.Iot.Types.UpdateScheduledAuditRequest = {
                frequency: 'MONTHLY',
                dayOfMonth: 'LAST',
                scheduledAuditName: 'CertificateRenewerAudit',
                targetCheckNames: ['DEVICE_CERTIFICATE_EXPIRING_CHECK'],
            };
            logger.debug(`UpdateScheduledAuditRequest Params: ${JSON.stringify(auditParams)}`);
            const auditResponse: AWS.Iot.Types.UpdateScheduledAuditResponse = await this._iot
                .updateScheduledAudit(auditParams)
                .promise();
            logger.debug(`UpdateScheduledAuditResponse: ${JSON.stringify(auditResponse)}`);
        } else {
            const auditParams: AWS.Iot.Types.CreateScheduledAuditRequest = {
                frequency: 'MONTHLY',
                dayOfMonth: 'LAST',
                scheduledAuditName: 'CertificateRenewerAudit',
                targetCheckNames: ['DEVICE_CERTIFICATE_EXPIRING_CHECK'],
            };
            logger.debug(`CreateScheduled AuditRequest Params: ${JSON.stringify(auditParams)}`);
            const auditResponse: AWS.Iot.Types.CreateScheduledAuditResponse = await this._iot
                .createScheduledAudit(auditParams)
                .promise();
            logger.debug(`CreateScheduled AuditResponse: ${JSON.stringify(auditResponse)}`);
        }

        return result;
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `IotDeviceDefender SettingCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }
}
