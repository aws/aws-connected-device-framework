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
import { inject, injectable } from 'inversify';

import { logger } from '../utils/logger';

import {CustomResourceEvent} from './customResource.model';
import {
    LambdaInvokerService,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
} from '@awssolutions/cdf-lambda-invoke';
import { CustomResource } from './customResource';
import ow from 'ow';

@injectable()
export class AssetLibraryBulkGroupsCustomResource implements CustomResource {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService
    ) {}

    protected headers:{[key:string]:string};

    public async create(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`AssetLibraryBulkGroupsCustomResource: create: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);

        const functionName = customResourceEvent?.ResourceProperties?.FunctionName;
        const contentType = customResourceEvent?.ResourceProperties?.ContentType;
        const rawBody = customResourceEvent?.ResourceProperties?.Body;

        ow(functionName, ow.string.nonEmpty);
        ow(contentType, ow.string.nonEmpty);
        ow(rawBody, ow.string.nonEmpty);

        const headers = this.getHeaders(contentType);
        const path = '/bulkgroups';
        const body = JSON.parse(rawBody);

        if ( (body.groups?.length??0) === 0) {
            return {}
        }

        const event = new LambdaApiGatewayEventBuilder()
                .setMethod('POST')
                .setPath(path)
                .setHeaders(headers)
                .setBody(body);
        const res = await this.lambdaInvoker.invoke(functionName, event);


        const bulkGroupsRes = res.body

        // check if there are errors,
        if (bulkGroupsRes && bulkGroupsRes.errors && Object.keys(bulkGroupsRes.errors).length > 0) {

            const failedGroupPaths = Object.keys(bulkGroupsRes.errors)

            for (const groupPath of failedGroupPaths) {
                const error = bulkGroupsRes.errors[groupPath]

                if (error.statusCode === 499) {
                    const group = body.groups.filter((group:{[key:string]: string}) => {
                        const _groupPath = (group.parentPath === '/')
                            ? '/' + group.name.toLowerCase()
                            : `${group.parentPath}/${group.name.toLowerCase()}`;
                        return _groupPath === groupPath
                    })[0]

                    try {
                        const patchRes =  await this.patchGroup(functionName, headers, group)
                        logger.debug(`AssetLibraryBulkGroupsCustomResource: pathGroup: response: ${JSON.stringify(patchRes)}`);
                    } catch (err) {
                        logger.error(`AssetLibraryBulkGroupsCustomResource: patchGroup: ${JSON.stringify(err)}`);
                    }

                }
            }
        }

        logger.debug(`AssetLibraryBulkGroupsCustomResource: create: exit: ${JSON.stringify(res)}`);
        return {};
    }

    public async update(customResourceEvent: CustomResourceEvent) : Promise<unknown> {
        logger.debug(`AssetLibraryBulkGroupsCustomResource: update: in: customResourceEvent: ${JSON.stringify(customResourceEvent)}`);
        return await this.create(customResourceEvent);
    }

    public async delete(_customResourceEvent: CustomResourceEvent) : Promise<unknown> {
         return {};
    }

    protected getHeaders(contentType:string): {[key:string]:string} {
        if (this.headers===undefined) {
            const h = {
                'Accept': contentType,
                'Content-Type': contentType
            };
            this.headers = {...h};
        }
        return this.headers;
    }

    protected async patchGroup(functionName: string, headers: {[key:string]: string}, group:{[key:string]: string}): Promise<any> {
        logger.debug(`AssetLibraryBulkGroupsCustomResource: patchGroup: in: functionName:${functionName}, group:${JSON.stringify(group)}`);
        const groupPath = (group.parentPath === '/')
            ? '/' + group.name.toLowerCase()
            : `${group.parentPath}/${group.name.toLowerCase()}`;

        const path = `/groups/${encodeURIComponent(groupPath)}`
        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('PATCH')
            .setPath(path)
            .setHeaders(headers)
            .setBody(group)

        const res = await this.lambdaInvoker.invoke(functionName, event);
        logger.debug(`AssetLibraryBulkGroupsCustomResource: patchGroup: exit: ${JSON.stringify(res)}`);

        return res;
    }

}
