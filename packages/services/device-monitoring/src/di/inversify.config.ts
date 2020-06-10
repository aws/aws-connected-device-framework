/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Container } from 'inversify';
import {AssetLibUpdate} from '../assetlib_update';
import {assetLibraryContainerModule} from '@cdf/assetlibrary-client/dist';
import {TYPES} from './types';

// Load everything needed to the Container
export const container = new Container();

// bind containers from the cdf client modules
container.load(assetLibraryContainerModule);

container.bind<AssetLibUpdate>(TYPES.AssetLibUpdate).to(AssetLibUpdate);
