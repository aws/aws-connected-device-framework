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

import { Container } from 'inversify';

import {assetLibraryContainerModule} from '@cdf/assetlibrary-client';
import {assetLibraryHistoryContainerModule} from '@cdf/assetlibraryhistory-client';
import {commandsContainerModule} from '@cdf/commands-client';
import {provisioningContainerModule} from '@cdf/provisioning-client';
import {notificationsContainerModule} from '@cdf/notifications-client';
import {greengrassDeploymentContainerModule} from '@cdf/greengrass-deployment-client';
import {greengrassProvisioningContainerModule} from '@cdf/greengrass-provisioning-client';
import { CDFConfigInjector } from '@cdf/config-inject';

// Load everything needed to the Container
export const container = new Container();

const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(assetLibraryHistoryContainerModule);
container.load(commandsContainerModule);
container.load(provisioningContainerModule);
container.load(notificationsContainerModule);
container.load(greengrassDeploymentContainerModule);
container.load(greengrassProvisioningContainerModule);
