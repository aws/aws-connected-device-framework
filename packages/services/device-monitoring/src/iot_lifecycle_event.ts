/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { AssetLibUpdate } from './assetlib_update';
import { logger } from './utils/logger';
let connected:boolean;
const assetLib = new AssetLibUpdate();

exports.lambda_handler = async (event: any, context: any) => {
  logger.debug(`event: ${JSON.stringify(event)}`);
  console.log(`context: ${JSON.stringify(context)}`);

  const clientId = event.clientId;

  // TODO: figure out how to extract a boolean `connected` from the eventType
  const status = event.eventType;
  if (status === 'connected') {
    connected = true;
  } else {
    connected = false;
  }

  await assetLib.updateDeviceConnected(clientId, connected);
};
