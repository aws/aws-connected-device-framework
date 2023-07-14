/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the 'License'). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import ow from 'ow';
import { Document } from 'yaml';

import { InstallerConfig } from '../installerConfig/installer.models';
import { logger } from '@awssolutions/simple-cdf-logger';
import { ConfigGeneratorEvent, ConfigGeneratorHandler } from './models';

export type FleetProvisioningConfig = {
    rootCaPath: string;
    rootPath: string;
    awsRegion: string;
    iotRoleAlias: string;
    iotDataEndpoint: string;
    iotCredEndpoint: string;
    claimCertificatePath: string;
    claimCertificatePrivateKeyPath: string;
};

export const fleetProvisioningHandler =
    (handlerConfig: FleetProvisioningConfig): ConfigGeneratorHandler =>
    async (event: ConfigGeneratorEvent): Promise<unknown> => {
        logger.debug(`fleetProvisioningHandler: in: event: ${JSON.stringify(event)}`);

        ow(event?.coreDeviceName, ow.string.nonEmpty);
        ow(event.version, ow.string.nonEmpty);
        ow(event.provisioningTemplate, ow.string.nonEmpty);

        const configJson: InstallerConfig = {
            services: {
                'aws.greengrass.Nucleus': {
                    componentType: 'NUCLEUS',
                    version: event.version,
                    configuration: {
                        awsRegion: handlerConfig.awsRegion,
                        iotRoleAlias: handlerConfig.iotRoleAlias,
                        iotDataEndpoint: handlerConfig.iotDataEndpoint,
                        iotCredEndpoint: handlerConfig.iotCredEndpoint,
                    },
                },
                'aws.greengrass.FleetProvisioningByClaim': {
                    configuration: {
                        rootPath: handlerConfig.rootPath,
                        awsRegion: handlerConfig.awsRegion,
                        iotDataEndpoint: handlerConfig.iotDataEndpoint,
                        iotCredentialEndpoint: handlerConfig.iotCredEndpoint,
                        iotRoleAlias: handlerConfig.iotRoleAlias,
                        provisioningTemplate: event.provisioningTemplate,
                        claimCertificatePath: handlerConfig.claimCertificatePath,
                        claimCertificatePrivateKeyPath:
                            handlerConfig.claimCertificatePrivateKeyPath,
                        rootCaPath: handlerConfig.rootCaPath,
                        templateParameters: event.templateParameters,
                    },
                },
            },
        };

        const doc = new Document();
        doc.directivesEndMarker = true;
        doc.contents = configJson;

        const configYaml = String(doc);

        logger.debug(`fleetProvisioningHandler: exit: ${configYaml}`);
        return { config: configYaml };
    };
