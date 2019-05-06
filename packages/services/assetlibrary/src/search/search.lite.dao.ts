/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import {TYPES} from '../di/types';
import { SearchRequestModel } from './search.models';
import {NodeAssembler} from '../data/assembler';
import { Iot } from 'aws-sdk';
import { TypeCategory } from '../types/constants';

@injectable()
export class SearchDaoLite {

    private readonly iot: AWS.Iot;

    public constructor(
        @inject(TYPES.NodeAssembler) private assembler:NodeAssembler,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
            this.iot = iotFactory();
    }

    private isDevice(types?: string[]): boolean {
        return types!==undefined && types.includes(TypeCategory.Device);
    }

    private buildQueryString(request: SearchRequestModel) : string {

        logger.debug(`search.lite.dao buildQueryString: in: request: ${JSON.stringify(request)}`);

        const filters: string[]= [];

        // if a group is provided, that becomes the starting point
        if (request.ancestorPath!==undefined) {
            const field = this.isDevice(request.types) ? 'thingGroupNames' : 'parentGroupNames';
            filters.push(`${field}:${request.ancestorPath}`);
        }

        // filtering by custom types
        if (this.isDevice(request.types)) {
            const customType = request.types.filter(t => t !== TypeCategory.Device && t !== TypeCategory.Group)[0];
            if (customType!==undefined && customType!==null) {
                filters.push(`thingTypeName:${customType}`);
            }
        }

        if (request.eq!==undefined) {
            Object.keys(request.eq).forEach( key => {
                filters.push(`${this.getFilterKey(key)}:${request.eq[key]}`);
            });
        }
        if (request.neq!==undefined) {
            Object.keys(request.neq).forEach( key => {
                filters.push(`NOT ${this.getFilterKey(key)}:${request.neq[key]}`);
            });
        }
        if (request.lt!==undefined) {
            Object.keys(request.lt).forEach( key => {
                filters.push(`${this.getFilterKey(key)}<${request.lt[key]}`);
            });
        }
        if (request.lte!==undefined) {
            Object.keys(request.lte).forEach( key => {
                filters.push(`${this.getFilterKey(key)}<=${request.lte[key]}`);
            });
        }
        if (request.gt!==undefined) {
            Object.keys(request.gt).forEach( key => {
                filters.push(`${this.getFilterKey(key)}>${request.gt[key]}`);
            });
        }
        if (request.gte!==undefined) {
            Object.keys(request.gte).forEach( key => {
                filters.push(`${this.getFilterKey(key)}>=${request.gte[key]}`);
            });
        }
        if (request.startsWith!==undefined) {
            Object.keys(request.startsWith).forEach(key => {
                filters.push(`${this.getFilterKey(key)}:${request.startsWith[key]}*`);
            });
        }
        if (request.endsWith!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }
        if (request.contains!==undefined) {
            throw new Error('NOT_SUPPORTED');
        }

        const filtersAsString = filters.join(' ');
        logger.debug(`search.lite.dao buildQueryString: filters: ${filtersAsString}`);

        return filtersAsString;
    }

    private getFilterKey(key:string) : string {

        if (key==='deviceId') {
            return 'thingName';
        } else if (key==='groupPath') {
            return 'thingGroupName';
        } else {
            return key;
        }
    }

    private getIndexName(types:string[]):string {
        logger.debug(`search.lite.dao getIndexName: in: types: ${JSON.stringify(types)}`);

        const indexName = types.includes('group') ?  'AWS_ThingGroups' : 'AWS_Things';

        logger.debug(`search.lite.dao getIndexName: exit: ${indexName}`);
        return indexName;

    }

    public async search(request: SearchRequestModel, nextToken:string, maxResults:number): Promise<Node[]> {
        logger.debug(`search.lite.dao search: in: request: ${JSON.stringify(request)}, nextToken:${nextToken}, maxResults:${maxResults}`);

        const indexName = this.getIndexName(request.types);
        const queryString = this.buildQueryString(request,);

        const params: Iot.Types.SearchIndexRequest = {
            indexName,
            queryString,
            maxResults,
            nextToken
        };
        const results = await this.iot.searchIndex(params).promise();

        logger.debug(`search.lite.dao search: results:${JSON.stringify(results)}`);

        let noResults=false;
        if (request.types.includes('group')) {
            noResults = (results.thingGroups.length===0);
        } else {
            noResults = (results.things.length===0);
        }
        if (noResults) {
            logger.debug(`search.lite.dao search: exit: node: undefined`);
            return undefined;
        }

        const nodes: Node[] = [];
        if (results.things) {
            for(const thing of results.things) {
                nodes.push(this.assembler.toNodeFromThingDocument(thing));
            }
        }
        if (results.thingGroups) {
            for(const group of results.thingGroups) {
                nodes.push(this.assembler.toNodeFromThingGroupDocument(group));
            }
        }

        logger.debug(`search.lite.dao search: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

}
