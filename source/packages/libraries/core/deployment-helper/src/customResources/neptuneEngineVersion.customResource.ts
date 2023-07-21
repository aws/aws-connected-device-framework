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
import { injectable } from 'inversify';
import * as request from 'superagent';

import { logger } from '@awssolutions/simple-cdf-logger';

import { CustomResource } from './customResource';
import { CustomResourceEvent } from './customResource.model';

// min supported versions
const minSupportedVersion = '1.2.0.0.R2';

@injectable()
export class NeptuneEngineVersionCustomResource implements CustomResource {
    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const endpoint = customResourceEvent.ResourceProperties.DBClusterEndpoint;

        const result = await request.get(`https://${endpoint}:8182/status`);
        const dbEngineVersion = result.body.dbEngineVersion;
        return {
            DBEngineVersion: dbEngineVersion,
        };
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        const endpoint = customResourceEvent.ResourceProperties.DBClusterEndpoint;

        let result;
        try {
            result = await request.get(`https://${endpoint}:8182/status`);
            logger.debug(result);
        } catch (err) {
            logger.error(err);
            throw new Error(err);
        }
        const dbEngineVersion = result.body.dbEngineVersion;

        this.verifyVersion(dbEngineVersion, minSupportedVersion);

        return {
            DBEngineVersion: dbEngineVersion,
        };
    }

    public async delete(_customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return {};
    }

    private verifyVersion(current: string, minimum: string) {
        // split and convert the version to array
        const version1 = current.split('.');
        const version2 = minimum.split('.');

        // join the first 4 parts of the version back
        const currentSemver = version1.slice(0, 4).join('.');
        const minSemver = version2.slice(0, 4).join('.');

        // compare the first 4 parts
        if (currentSemver === minSemver) {
            // if they are equal compare the build part of the version
            if (version1[4] < version2[4]) {
                const err = new Error();
                err.message = `Neptune minimum dbEngine version ${minSupportedVersion} is required`;
                err.name = 'EngineVersionException';
                throw err;
            }
        }

        return {};
    }
}
