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
import 'reflect-metadata';

import { assetLibraryContainerModule } from '@awssolutions/cdf-assetlibrary-client';
import { assetLibraryHistoryContainerModule } from '@awssolutions/cdf-assetlibraryhistory-client';
import { commandAndControlContainerModule } from '@awssolutions/cdf-commandandcontrol-client';
import { commandsContainerModule } from '@awssolutions/cdf-commands-client';
import '@awssolutions/cdf-config-inject';
import { devicePatcherContainerModule } from '@awssolutions/cdf-device-patcher-client';
import { greengrass2ProvisioningContainerModule } from '@awssolutions/cdf-greengrass2-provisioning-client';
import { notificationsContainerModule } from '@awssolutions/cdf-notifications-client';
import { organizationManagerContainerModule } from '@awssolutions/cdf-organizationmanager-client';
import { provisioningContainerModule } from '@awssolutions/cdf-provisioning-client';
import { Container } from 'inversify';

// Load everything needed to the Container
export const container = new Container();

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(assetLibraryHistoryContainerModule);
container.load(commandsContainerModule);
container.load(provisioningContainerModule);
container.load(notificationsContainerModule);
container.load(greengrass2ProvisioningContainerModule);
container.load(devicePatcherContainerModule);
container.load(commandAndControlContainerModule);
container.load(organizationManagerContainerModule);
