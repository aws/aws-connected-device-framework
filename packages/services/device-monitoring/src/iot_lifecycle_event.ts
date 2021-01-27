/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { AssetLibUpdate } from './assetlib_update';
import { logger } from './utils/logger';
import { container } from './di/inversify.config';
import {TYPES} from './di/types';

let assetLib:AssetLibUpdate;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.lambda_handler = async (event: any, _context: unknown) => {
  logger.debug(`event: ${JSON.stringify(event)}`);

  if (assetLib===undefined) {
    assetLib = container.get(TYPES.AssetLibUpdate);
  }

  const clientId = event.clientId;

  // TODO: figure out how to extract a boolean `connected` from the eventType
  const status = event.eventType;
  let connected:boolean;
  if (status === 'connected') {
    connected = true;
  } else if (status === 'disconnected') {
    if (event.disconnectReason === 'DUPLICATE_CLIENTID') {
      return;
    } else {
      connected = false;
    }
  } else {
    connected = false;
  }

  await assetLib.updateDeviceConnected(clientId, connected);
};
