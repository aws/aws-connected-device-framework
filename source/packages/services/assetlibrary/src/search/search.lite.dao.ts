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
import { logger } from '@awssolutions/simple-cdf-logger';
import { Iot } from 'aws-sdk';
import { inject, injectable } from 'inversify';
import { NodeAssembler } from '../data/assembler';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { TypeCategory } from '../types/constants';
import { NotSupportedError } from '../utils/errors';
import { SearchRequestModel } from './search.models';

@injectable()
export class SearchDaoLite {
    private readonly iot: AWS.Iot;

    public constructor(
        @inject(TYPES.NodeAssembler) private assembler: NodeAssembler,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot
    ) {
        this.iot = iotFactory();
    }

    private isDevice(types?: string[]): boolean {
        return types !== undefined && types.includes(TypeCategory.Device);
    }

    private buildQueryString(request: SearchRequestModel): string {
        logger.debug(`search.lite.dao buildQueryString: in: request: ${JSON.stringify(request)}`);

        const filters: string[] = [];

        // if a group is provided, that becomes the starting point
        if (request.ancestorPath !== undefined) {
            const field = this.isDevice(request.types) ? 'thingGroupNames' : 'parentGroupNames';
            filters.push(`${field}:${request.ancestorPath}`);
        }

        // filtering by custom types
        if (this.isDevice(request.types)) {
            const customType = request.types.filter(
                (t) => t !== TypeCategory.Device && t !== TypeCategory.Group
            )[0];
            if (customType !== undefined && customType !== null) {
                filters.push(`thingTypeName:${customType}`);
            }
        }

        if (request.eq !== undefined) {
            request.eq.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])}:${filter['value']}`);
            });
        }
        if (request.neq !== undefined) {
            request.neq.forEach((filter) => {
                filters.push(`NOT ${this.getFilterKey(filter['field'])}:${filter['value']}`);
            });
        }
        if (request.lt !== undefined) {
            request.lt.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])} < ${filter['value']}`);
            });
        }
        if (request.lte !== undefined) {
            request.lte.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])}<=${filter['value']}`);
            });
        }
        if (request.gt !== undefined) {
            request.gt.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])}>${filter['value']}`);
            });
        }
        if (request.gte !== undefined) {
            request.gte.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])}>=${filter['value']}`);
            });
        }
        if (request.startsWith !== undefined) {
            request.startsWith.forEach((filter) => {
                filters.push(`${this.getFilterKey(filter['field'])}:${filter['value']}*`);
            });
        }
        if (request.endsWith !== undefined) {
            throw new NotSupportedError();
        }
        if (request.contains !== undefined) {
            throw new NotSupportedError();
        }
        const filtersAsString = filters.join(' ');
        logger.debug(`search.lite.dao buildQueryString: filters: ${filtersAsString}`);

        return filtersAsString;
    }

    private getFilterKey(key: string): string {
        if (key === 'deviceId') {
            return 'thingName';
        } else if (key === 'groupPath') {
            return 'thingGroupName';
        } else {
            return key;
        }
    }

    private getIndexName(types: string[]): string {
        logger.debug(`search.lite.dao getIndexName: in: types: ${JSON.stringify(types)}`);

        const indexName = types.includes('group') ? 'AWS_ThingGroups' : 'AWS_Things';

        logger.debug(`search.lite.dao getIndexName: exit: ${indexName}`);
        return indexName;
    }

    public async search(
        request: SearchRequestModel,
        nextToken: string,
        maxResults: number
    ): Promise<Node[]> {
        logger.debug(
            `search.lite.dao search: in: request: ${JSON.stringify(
                request
            )}, nextToken:${nextToken}, maxResults:${maxResults}`
        );

        const indexName = this.getIndexName(request.types);
        const queryString = this.buildQueryString(request);

        const params: Iot.Types.SearchIndexRequest = {
            indexName,
            queryString,
            maxResults,
            nextToken,
        };
        const results = await this.iot.searchIndex(params).promise();

        logger.debug(`search.lite.dao search: results:${JSON.stringify(results)}`);

        let noResults = false;
        if (request.types.includes('group')) {
            noResults = results.thingGroups.length === 0;
        } else {
            noResults = results.things.length === 0;
        }
        if (noResults) {
            logger.debug(`search.lite.dao search: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        if (results.things) {
            for (const thing of results.things) {
                nodes.push(this.assembler.toNodeFromThingDocument(thing));
            }
        }
        if (results.thingGroups) {
            for (const group of results.thingGroups) {
                nodes.push(this.assembler.toNodeFromThingGroupDocument(group));
            }
        }

        logger.debug(`search.lite.dao search: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }
}
