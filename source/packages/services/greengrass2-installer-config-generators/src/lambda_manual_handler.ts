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
import '@awssolutions/cdf-config-inject';

import {
    GG_DATA_PLANE_PORT,
    ManualProvisioningConfig,
    manualProvisioningHandler,
} from './generators/manual.generator';

const handlerConfig: ManualProvisioningConfig = {
    certificateFilePath: process.env.DEVICE_CERTIFICATE_FILE_PATH,
    privateKeyPath: process.env.DEVICE_PRIVATE_KEY_PATH,
    rootCaPath: process.env.DEVICE_ROOT_CA_PATH,
    rootPath: process.env.DEVICE_ROOT_PATH,
    awsRegion: process.env.AWS_REGION,
    iotRoleAlias: process.env.AWS_IOT_ROLE_ALIAS,
    iotDataEndpoint: process.env.AWS_IOT_ENDPOINT_DATA,
    iotCredEndpoint: process.env.AWS_IOT_ENDPOINT_CREDENTIALS,
    mqttPort: parseInt(process.env.MQTT_PORT),
    greengrassDataPlanePort: process.env.GG_DATA_PLANE_PORT as unknown as GG_DATA_PLANE_PORT,
};

exports.handler = manualProvisioningHandler(handlerConfig);
