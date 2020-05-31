/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';

import { Container } from 'inversify';

import {assetLibraryContainerModule} from '@cdf/assetlibrary-client';
import {assetLibraryHistoryContainerModule} from '@cdf/assetlibraryhistory-client';
import {commandsContainerModule} from '@cdf/commands-client';
import {provisioningContainerModule} from '@cdf/provisioning-client';

// Load everything needed to the Container
export const container = new Container();

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);
container.load(assetLibraryHistoryContainerModule);
container.load(commandsContainerModule);
container.load(provisioningContainerModule);
