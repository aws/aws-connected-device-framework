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
import { assembleSortKeys } from '../data/model';
import { DevicesAssembler } from '../devices/devices.assembler';
import { DeviceBaseResource, DeviceItem, determineIfDeviceItem } from '../devices/devices.models';
import { TYPES } from '../di/types';
import { GroupsAssembler } from '../groups/groups.assembler';
import { GroupBaseResource, GroupItem, determineIfGroupItem } from '../groups/groups.models';
import { TypeUtils } from '../utils/typeUtils';
import {
    SearchRequestFilterDirection,
    SearchRequestFilterTraversal,
    SearchRequestFilters,
    SearchRequestModel,
    SearchResultsResource,
} from './search.models';

@injectable()
export class SearchAssembler {
    constructor(
        @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler,
        @inject(TYPES.TypeUtils) private typeUtils: TypeUtils
    ) {}

    public toSearchRequestModel(
        types: string | string[],
        ntypes: string | string[],
        ancestorPath: string,
        includeAncestor: boolean,
        eqs: string | string[],
        neqs: string | string[],
        lts: string | string[],
        ltes: string | string[],
        gts: string | string[],
        gtes: string | string[],
        startsWiths: string | string[],
        endsWiths: string | string[],
        containses: string | string[],
        fulltexts: string | string[],
        regexes: string | string[],
        lucenes: string | string[],
        exists: string | string[],
        nexists: string | string[],
        facetField: string,
        offset?: number,
        count?: number,
        sort?: string
    ): SearchRequestModel {
        const req = new SearchRequestModel();
        if (types !== undefined) {
            if (typeof types === 'string') {
                req.types.push(types);
            } else {
                (<string[]>types).forEach((t) => req.types.push(t));
            }
        }
        if (ntypes !== undefined) {
            if (typeof ntypes === 'string') {
                req.ntypes.push(ntypes);
            } else {
                (<string[]>ntypes).forEach((t) => req.ntypes.push(t));
            }
        }

        req.ancestorPath = ancestorPath;
        req.includeAncestor = includeAncestor ? Boolean(includeAncestor) : undefined;
        req.eq = this.toSearchRequestFilters(eqs);
        req.neq = this.toSearchRequestFilters(neqs);
        req.lt = this.toSearchRequestFilters(lts);
        req.lte = this.toSearchRequestFilters(ltes);
        req.gt = this.toSearchRequestFilters(gts);
        req.gte = this.toSearchRequestFilters(gtes);
        req.startsWith = this.toSearchRequestFilters(startsWiths);
        req.endsWith = this.toSearchRequestFilters(endsWiths);
        req.contains = this.toSearchRequestFilters(containses);
        req.fulltext = this.toSearchRequestFilters(fulltexts);
        req.regex = this.toSearchRequestFilters(regexes);
        req.lucene = this.toSearchRequestFilters(lucenes);
        req.exists = this.toSearchRequestFilters(exists);
        req.nexists = this.toSearchRequestFilters(nexists);

        if (facetField !== undefined) {
            const v = facetField.split(':');
            if (v.length % 2 === 1) {
                // optional traversals
                let traversals: SearchRequestFilterTraversal[];
                if (v.length > 1) {
                    traversals = [];
                    for (let i = 0; i < v.length - 1; i += 2) {
                        traversals.push({
                            relation: v[i],
                            direction: SearchRequestFilterDirection[v[i + 1]],
                        });
                    }
                }
                req.facetField = {
                    traversals,
                    field: v[v.length - 1],
                };
            }
        }

        const { offsetAsInt, countAsInt } = this.typeUtils.parseAndValidateOffsetAndCount(
            offset,
            count
        );
        req.offset = offsetAsInt;
        req.count = countAsInt;
        req.sort = assembleSortKeys(sort);

        return req;
    }

    private toSearchRequestFilters(filter: string | string[]): SearchRequestFilters {
        let response: SearchRequestFilters;

        if (filter !== undefined) {
            response = [];
            if (typeof filter === 'string') {
                filter = [filter];
            }
            (<string[]>filter).forEach((i) => {
                const v = i.split(':');
                if (v.length === 2) {
                    // no traversals
                    response.push({
                        field: v[0],
                        value: decodeURIComponent(v[1]),
                    });
                } else if (v.length > 2 && v.length % 2 === 0) {
                    // traversals
                    const traversals: SearchRequestFilterTraversal[] = [];
                    for (let j = 0; j < v.length - 2; j += 2) {
                        traversals.push({
                            relation: v[j],
                            direction: SearchRequestFilterDirection[v[j + 1]],
                        });
                    }
                    response.push({
                        traversals,
                        field: v[v.length - 2],
                        value: decodeURIComponent(v[v.length - 1]),
                    });
                }
            });
        }

        return response;
    }

    public toSearchResultsResource(
        items: (DeviceItem | GroupItem)[],
        version: string
    ): SearchResultsResource {
        if (items === undefined) {
            return undefined;
        }

        const resources: SearchResultsResource = {
            results: [],
        };

        items.forEach((item) => {
            if (determineIfDeviceItem(item)) {
                (<(GroupBaseResource | DeviceBaseResource)[]>resources.results).push(
                    this.devicesAssembler.toDeviceResource(item, version)
                );
            } else if (determineIfGroupItem(item)) {
                (<(GroupBaseResource | DeviceBaseResource)[]>resources.results).push(
                    this.groupsAssembler.toGroupResource(item, version)
                );
            }
        });

        return resources;
    }
}
