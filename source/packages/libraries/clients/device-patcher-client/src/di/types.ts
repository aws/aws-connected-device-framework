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
export const DEVICE_PATCHER_CLIENT_TYPES = {
    PatchService: Symbol.for('DevicePatcherClient_PatchService'),
    ActivationService: Symbol.for('DevicePatcherClient_ActivationService'),
    TemplatesService: Symbol.for('DevicePatcherClient_TemplatesService'),

    RestClient: Symbol.for('DevicePatcherClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<DevicePatcherClient_RestClient>'),
};
