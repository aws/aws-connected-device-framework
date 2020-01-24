/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { SearchRequestModel, SearchRequestFilters, SearchRequestFilterDirection, SearchRequestFilterTraversal, SearchResultsResource } from './search.models';
import { injectable, inject } from 'inversify';
import { DeviceItem, determineIfDeviceItem, DeviceBaseResource } from '../devices/devices.models';
import { GroupItem, determineIfGroupItem, GroupBaseResource } from '../groups/groups.models';
import { TYPES } from '../di/types';
import { DevicesAssembler } from '../devices/devices.assembler';
import { GroupsAssembler } from '../groups/groups.assembler';

@injectable()
export class SearchAssembler {

    constructor( @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
        @inject(TYPES.GroupsAssembler) private groupsAssembler: GroupsAssembler  ) {}

    public toSearchRequestModel(types:string|string[], ancestorPath:string,
        eqs:string|string[], neqs:string|string[], lts:string|string[], ltes:string|string[],
        gts:string|string[], gtes:string|string[], startsWiths:string|string[],
        exists:string|string[], nexists:string|string[], facetField:string): SearchRequestModel {

        const req = new SearchRequestModel();
        if (types!==undefined) {
            if (typeof types === 'string') {
                req.types.push(types);
            } else {
                (<string[]>types).forEach(t=> req.types.push(t));
            }
        }
        req.ancestorPath=ancestorPath;

        req.eq = this.toSearchRequestFilters(eqs);
        req.neq = this.toSearchRequestFilters(neqs);
        req.lt = this.toSearchRequestFilters(lts);
        req.lte = this.toSearchRequestFilters(ltes);
        req.gt = this.toSearchRequestFilters(gts);
        req.gte = this.toSearchRequestFilters(gtes);
        req.startsWith = this.toSearchRequestFilters(startsWiths);

        req.exists = this.toSearchRequestFilters(exists);
        req.nexists = this.toSearchRequestFilters(nexists);

        if (facetField!==undefined) {
            const v = facetField.split(':');
            if (v.length % 2 === 1) {
                // optional traversals
                let traversals: SearchRequestFilterTraversal[];
                if (v.length>1) {
                    traversals = [];
                    for(let i=0; i<v.length-1; i+=2) {
                        traversals.push({relation:v[i], direction: SearchRequestFilterDirection[v[i+1]]});
                    }
                }
                req.facetField = {
                    traversals,
                    field:v[v.length-1]
                };
            }
        }

        return req;
    }

    private toSearchRequestFilters (filter:string|string[]): SearchRequestFilters {

        let response:SearchRequestFilters;

        if (filter!==undefined) {
            response = [];
            if (typeof filter === 'string') {
                filter=[filter];
            }
            (<string[]>filter).forEach(i=> {
                const v = i.split(':');
                if (v.length===2) {
                    // no traversals
                    response.push({
                        field:v[0],
                        value:v[1]
                    });
                } else if (v.length>2 && v.length % 2 === 0) {
                    // traversals
                    const traversals: SearchRequestFilterTraversal[] = [];
                    for(let j=0; j<v.length-2; j+=2) {
                        traversals.push({relation:v[j], direction: SearchRequestFilterDirection[v[j+1]]});
                    }
                    response.push({
                        traversals,
                        field:v[v.length-2],
                        value:v[v.length-1]
                    });
                }
            });
        }

        return response;
    }

    public toSearchResultsResource(items: (DeviceItem|GroupItem)[], version:string): SearchResultsResource {

        if (items===undefined) {
            return undefined;
        }

        const resources:SearchResultsResource = {
            results:[]
        };

        items.forEach(item=> {
            if (determineIfDeviceItem(item)) {
                (<(GroupBaseResource|DeviceBaseResource)[]> resources.results).push(this.devicesAssembler.toDeviceResource(item, version));
            } else if (determineIfGroupItem(item)) {
                (<(GroupBaseResource|DeviceBaseResource)[]> resources.results).push(this.groupsAssembler.toGroupResource(item, version));
            }
        });

        return resources;
    }

}
