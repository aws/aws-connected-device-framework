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
import { getRequestIdFromContext, logger, setRequestId } from '@awssolutions/simple-cdf-logger';
import { AssetLibUpdate } from './assetlib_update';
import { container } from './di/inversify.config';
import { TYPES } from './di/types';

let assetLib: AssetLibUpdate;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.lambda_handler = async (event: any, _context: unknown) => {
    logger.debug(`event: ${JSON.stringify(event)}`);

    setRequestId(getRequestIdFromContext(_context));

    if (assetLib === undefined) {
        assetLib = container.get(TYPES.AssetLibUpdate);
    }

    const clientId = event.clientId;

    // TODO: figure out how to extract a boolean `connected` from the eventType
    const status = event.eventType;
    let connected: boolean;
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
