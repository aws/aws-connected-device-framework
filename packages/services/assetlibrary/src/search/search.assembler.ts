/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { SearchRequestModel, SearchRequestFilters, SearchRequestFilterDirection, SearchRequestFilterTraversal } from './search.models';
import { injectable } from 'inversify';

@injectable()
export class SearchAssembler {

    public toSearchRequestModel(types:string|string[], ancestorPath:string,
        eqs:string|string[], neqs:string|string[], lts:string|string[], ltes:string|string[],
        gts:string|string[], gtes:string|string[], startsWiths:string|string[], facetField:string): SearchRequestModel {

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

        if (facetField!==undefined) {
            const v = facetField.split(':');
            if (v.length % 2 === 1) {
                // optional traversals
                const traversals: SearchRequestFilterTraversal[] = [];
                for(let i=0; i<v.length-1; i+=2) {
                    traversals.push({relation:v[i], direction: SearchRequestFilterDirection[v[i+1]]});
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

}
