/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { SearchRequestModel } from './search.models';
import { injectable } from 'inversify';

@injectable()
export class SearchAssembler {

    public  toSearchRequestModel(types:string|string[], ancestorPath:string,
        eqs:string|string[], neqs:string|string[], lts:string|string[], ltes:string|string[],
        gts:string|string[], gtes:string|string[], startsWiths:string|string[]): SearchRequestModel {

        const req = new SearchRequestModel();
        if (types!==undefined) {
            if (typeof types === 'string') {
                req.types.push(types);
            } else {
                (<string[]>types).forEach(t=> req.types.push(t));
            }
        }
        req.ancestorPath=ancestorPath;
        if (eqs!==undefined) {
            req.eq = {};
            if (typeof eqs === 'string') {
                const v = eqs.split(':');
                req.eq[v[0]]=v[1];
            } else {
                (<string[]>eqs).forEach(i=> {
                    const v = i.split(':');
                    req.eq[v[0]]=v[1];
                });
            }
        }
        if (neqs!==undefined) {
            req.neq = {};
            if (typeof neqs === 'string') {
                const v = neqs.split(':');
                req.neq[v[0]]=v[1];
            } else {
                (<string[]>neqs).forEach(i=> {
                    const v = i.split(':');
                    req.neq[v[0]]=v[1];
                });
            }
        }
        if (lts!==undefined) {
            req.lt = {};
            if (typeof lts === 'string') {
                const v = lts.split(':');
                req.lt[v[0]]=Number.parseFloat(v[1]);
            } else {
                (<string[]>lts).forEach(i=> {
                    const v = i.split(':');
                    req.lt[v[0]]=Number.parseFloat(v[1]);
                });
            }
        }
        if (ltes!==undefined) {
            req.lte = {};
            if (typeof ltes === 'string') {
                const v = ltes.split(':');
                req.lte[v[0]]=Number.parseFloat(v[1]);
            } else {
                (<string[]>ltes).forEach(i=> {
                    const v = i.split(':');
                    req.lte[v[0]]=Number.parseFloat(v[1]);
                });
            }
        }
        if (gts!==undefined) {
            req.gt = {};
            if (typeof gts === 'string') {
                const v = gts.split(':');
                req.gt[v[0]]=Number.parseFloat(v[1]);
            } else {
                (<string[]>gts).forEach(i=> {
                    const v = i.split(':');
                    req.gt[v[0]]=Number.parseFloat(v[1]);
                });
            }
        }
        if (gtes!==undefined) {
            req.gte = {};
            if (typeof gtes === 'string') {
                const v = gtes.split(':');
                req.gte[v[0]]=Number.parseFloat(v[1]);
            } else {
                (<string[]>gtes).forEach(i=> {
                    const v = i.split(':');
                    req.gte[v[0]]=Number.parseFloat(v[1]);
                });
            }
        }
        if (startsWiths!==undefined) {
            req.startsWith = {};
            if (typeof startsWiths === 'string') {
                const v = startsWiths.split(':');
                req.startsWith[v[0]]=v[1];
            } else {
                (<string[]>startsWiths).forEach(i=> {
                    const v = i.split(':');
                    req.startsWith[v[0]]=v[1];
                });
            }
        }

        return req;
    }

}
