/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container } from 'inversify';
import { CDFConfigInjector } from '@cdf/config-inject';
import { assetLibraryContainerModule } from '@cdf/assetlibrary-client';

import { AssetLibUpdate } from '../assetlib_update';
import { TYPES } from './types';

// Load everything needed to the Container
export const container = new Container();

// allow config to be injected
const configInjector = new CDFConfigInjector();
container.load(configInjector.getConfigModule());

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);

container.bind<AssetLibUpdate>(TYPES.AssetLibUpdate).to(AssetLibUpdate);
