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
import { AttributeValue, DynamoDBStreamEvent } from 'aws-lambda';

import { container } from './di/inversify.config';
import { TYPES } from './di/types';
import { FleetService, TemplateAttributes } from './fleet/fleet.service';
import { logger } from '@awssolutions/simple-cdf-logger';
import { expandDelimitedAttribute, PkType } from './utils/pkUtils.util';

const fleetSvc = container.get<FleetService>(TYPES.FleetService);

exports.handler = async (event: DynamoDBStreamEvent): Promise<void> => {
    logger.debug(`lambda_ddbstream_proxy handler: event: ${JSON.stringify(event)}`);

    if ((event?.Records?.length ?? 0) === 0) {
        logger.warn(`lambda_ddbstream_proxy handler: no records to process!`);
        return;
    }

    for (const r of event.Records) {
        if (r.eventSource !== 'aws:dynamodb') {
            logger.warn(`lambda_ddbstream_proxy handler: invalid event source!`);
            continue;
        }

        const pk = expandDelimitedAttribute(r.dynamodb?.Keys?.pk?.S);
        const sk = expandDelimitedAttribute(r.dynamodb?.Keys?.sk?.S);
        const oldImage = r.dynamodb?.OldImage;
        const newImage = r.dynamodb?.NewImage;

        /**
         * An update to a core device item. We check for differences between desired and reported
         * template status, then increment fleet summary accordingly.
         */
        if (
            pk[0] === PkType.CoreDevice &&
            pk.length == 2 &&
            sk[0] === PkType.CoreDevice &&
            sk.length == 2
        ) {
            await processCoreDeviceChange(oldImage, newImage);
        } else if (
            /**
             * A new template version has been created, therefore initialize fleet summary.
             */
            pk[0] === PkType.Template &&
            pk.length == 2 &&
            sk[0] === PkType.TemplateVersion &&
            sk[1] === 'current' &&
            sk.length === 2
        ) {
            if (r.eventName === 'INSERT' || r.eventName === 'MODIFY') {
                await initializeTemplateStatistics(newImage);
            }
        }
    }

    logger.debug(`lambda_ddbstream_proxy handler: exit:`);
};

type Image = { [key: string]: AttributeValue } | undefined;

async function processCoreDeviceChange(oldImage: Image, newImage: Image) {
    logger.debug(
        `lambda_ddbstream_proxy processCoreDeviceChange: oldImage:${JSON.stringify(
            oldImage,
        )}, newImage:${JSON.stringify(newImage)}`,
    );

    const oldDesired: TemplateAttributes = {
        name: oldImage?.desiredTemplateName?.S,
        version: parseInt(oldImage?.desiredTemplateVersion?.N),
        deploymentStatus: oldImage?.deploymentStatus?.S,
    };

    const newDesired: TemplateAttributes = {
        name: newImage?.desiredTemplateName?.S,
        version: parseInt(newImage?.desiredTemplateVersion?.N),
        deploymentStatus: newImage?.deploymentStatus?.S,
    };

    const oldReported: TemplateAttributes = {
        name: oldImage?.reportedTemplateName?.S,
        version: parseInt(oldImage?.reportedTemplateVersion?.N),
    };

    const newReported: TemplateAttributes = {
        name: newImage?.reportedTemplateName?.S,
        version: parseInt(newImage?.reportedTemplateVersion?.N),
    };

    const futures: Promise<void>[] = [];

    if (
        oldDesired.name !== newDesired.name ||
        oldDesired.version !== newDesired.version ||
        oldDesired.deploymentStatus !== newDesired.deploymentStatus
    ) {
        futures.push(fleetSvc.aggregateTemplateStatusChange('desired', oldDesired, newDesired));
    }
    if (oldReported.name !== newReported.name || oldReported.version !== newReported.version) {
        futures.push(fleetSvc.aggregateTemplateStatusChange('reported', oldReported, newReported));
    }

    if (futures.length > 0) {
        await Promise.all(futures);
    }
}

async function initializeTemplateStatistics(newImage: Image) {
    logger.debug(
        `lambda_ddbstream_proxy initializeTemplateStatistics: newImage:${JSON.stringify(
            newImage,
        )}`,
    );
    const name = newImage?.name?.S;
    const version = parseInt(newImage?.version?.N);

    await fleetSvc.initializeTemplateStatistics(name, version);
}
