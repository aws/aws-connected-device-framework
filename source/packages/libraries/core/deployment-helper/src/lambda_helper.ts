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
import { send } from 'cfn-response-promise';
import {
    CloudFormationCustomResourceCreateEvent,
    CloudFormationCustomResourceDeleteEvent,
    CloudFormationCustomResourceUpdateEvent,
    Context,
} from 'aws-lambda';

import { logger } from '@awssolutions/simple-cdf-logger';

exports.handler = async (
    event:
        | CloudFormationCustomResourceCreateEvent
        | CloudFormationCustomResourceUpdateEvent
        | CloudFormationCustomResourceDeleteEvent,
    context: Context,
) => {
    logger.debug(`Event:${JSON.stringify(event)} Context: ${JSON.stringify(context)}`);

    // TODO: Try Loading the config from S3
    // TODO: If not in S3 then just return empty

    if (event.RequestType === 'Create') {
        return await send(event, context, 'SUCCESS', {
            bulkCertsApplicationConfigOverride: JSON.stringify({}),
            deviceMonitoringApplicationConfigOverride: JSON.stringify({}),
            eventsProcessorApplicationConfigOverride: JSON.stringify({}),
            eventAlertsApplicationConfigOverride: JSON.stringify({}),
            requestQueueApplicationConfigOverride: JSON.stringify({}),
            provisioningApplicationConfigOverride: JSON.stringify({}),
            assetLibraryApplicationConfigOverride: JSON.stringify({}),
            assetLibraryHistoryApplicationConfigOverride: JSON.stringify({}),
            commandsApplicationConfigOverride: JSON.stringify({}),
            certificateActivatorApplicationConfigOverride: JSON.stringify({}),
            certificateVendorApplicationConfigOverride: JSON.stringify({}),
        });
    } else if (event.RequestType === 'Update') {
        return await send(event, context, 'SUCCESS', {
            bulkCertsApplicationConfigOverride: JSON.stringify({}),
            deviceMonitoringApplicationConfigOverride: JSON.stringify({}),
            eventsProcessorApplicationConfigOverride: JSON.stringify({}),
            eventAlertsApplicationConfigOverride: JSON.stringify({}),
            requestQueueApplicationConfigOverride: JSON.stringify({}),
            provisioningApplicationConfigOverride: JSON.stringify({}),
            assetLibraryApplicationConfigOverride: JSON.stringify({}),
            assetLibraryHistoryApplicationConfigOverride: JSON.stringify({}),
            commandsApplicationConfigOverride: JSON.stringify({}),
            certificateActivatorApplicationConfigOverride: JSON.stringify({}),
            certificateVendorApplicationConfigOverride: JSON.stringify({}),
        });
    } else if (event.RequestType === 'Delete') {
        return await send(event, context, 'SUCCESS', {
            bulkCertsApplicationConfigOverride: JSON.stringify({}),
            deviceMonitoringApplicationConfigOverride: JSON.stringify({}),
            eventsProcessorApplicationConfigOverride: JSON.stringify({}),
            eventAlertsApplicationConfigOverride: JSON.stringify({}),
            requestQueueApplicationConfigOverride: JSON.stringify({}),
            provisioningApplicationConfigOverride: JSON.stringify({}),
            assetLibraryApplicationConfigOverride: JSON.stringify({}),
            assetLibraryHistoryApplicationConfigOverride: JSON.stringify({}),
            commandsApplicationConfigOverride: JSON.stringify({}),
            certificateActivatorApplicationConfigOverride: JSON.stringify({}),
            certificateVendorApplicationConfigOverride: JSON.stringify({}),
        });
    }
};
