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
export const GREENGRASS2_PROVISIONING_CLIENT_TYPES = {
    TemplatesService: Symbol.for('Greengrass2ProvisioningClient_TemplatesService'),
    CoresService: Symbol.for('Greengrass2ProvisioningClient_CoresService'),
    DevicesService: Symbol.for('Greengrass2ProvisioningClient_DevicesService'),
    DeploymentsService: Symbol.for('Greengrass2ProvisioningClient_DeploymentsService'),
    FleetService: Symbol.for('Greengrass2ProvisioningClient_FleetService'),

    RestClient: Symbol.for('Greengrass2ProvisioningClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<Greengrass2ProvisioningClient_RestClient>'),
};
