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
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import { SearchRequestModel } from './search.models';
import {NodeAssembler} from '../data/assembler';
import {NeptuneConnection} from '../data/base.full.dao';
import { SearchDaoFull } from './search.full.dao';
import { TypeUtils } from '../utils/typeUtils';

const __ = process.statics;

@injectable()
export class SearchDaoEnhanced extends SearchDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject('enableDfeOptimization') enableDfeOptimization: boolean,
        @inject('openSearchEndpoint') private openSearchEndpoint: boolean,
        @inject(TYPES.TypeUtils) typeUtils: TypeUtils,
        @inject(TYPES.NodeAssembler) assembler: NodeAssembler,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, enableDfeOptimization, typeUtils, assembler, graphSourceFactory);
    }

    protected buildSearchTraverser(conn: NeptuneConnection, request: SearchRequestModel, authorizedPaths:string[]) : process.GraphTraversal {

        logger.debug(`search.enhanced.dao buildSearchTraverser: in: request: ${JSON.stringify(request)}, authorizedPaths:${authorizedPaths}`);

        let source: process.GraphTraversalSource = conn.traversal;
        if (this.enableDfeOptimization) {
            source = source.withSideEffect('Neptune#useDFE', true);
        }
        source = source.withSideEffect("Neptune#fts.endpoint", this.openSearchEndpoint);
        source = source.withSideEffect("Neptune#fts.queryType", "query_string");
        
        // if a path is provided, that becomes the starting point
        let traverser: process.GraphTraversal;
        if (request.ancestorPath!==undefined) {
            const ancestorId = `group___${request.ancestorPath}`;
            traverser = source.V(ancestorId).
                repeat(__.in_().simplePath().dedup()).emit().as('a');
        } else {
            traverser = source.V().as('a');
        }

        // construct Gremlin traverser from request parameters

        if (request.types!==undefined) {
            request.types.forEach(t=> traverser.select('a').hasLabel(t));
        }

        if (request.eq!==undefined) {
            request.eq.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, f.value);
            });
        }
        if (request.neq!==undefined) {
            request.neq.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.not(__.has(f.field, f.value));
            });
        }
        if (request.lt!==undefined) {
            request.lt.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.lt(Number(f.value)));
            });
        }
        if (request.lte!==undefined) {
            request.lte.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.lte(Number(f.value)));
            });
        }
        if (request.gt!==undefined) {
            request.gt.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.gt(Number(f.value)));
            });
        }
        if (request.gte!==undefined) {
            request.gte.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, process.P.gte(Number(f.value)));
            });
        }
        if (request.startsWith!==undefined) {
            request.startsWith.forEach(f=> {
                const luceneQueryKey = this.buildLuceneQueryKey(f.field, true);
                let luceneQueryVal = f.value.toString();
                [':', '/', ' '].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(char, 'g'), `\\${char}`);
                });
                ['[', ']'].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
                });
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has('*', `Neptune#fts ${luceneQueryKey}:${luceneQueryVal}*`);
            });
        }

        if (request.endsWith!==undefined) {
            request.endsWith.forEach(f=> {
                const luceneQueryKey = this.buildLuceneQueryKey(f.field, true);
                let luceneQueryVal = f.value.toString();
                [':', '/', ' '].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(char, 'g'), `\\${char}`);
                });
                ['[', ']'].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
                });
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has('*', `Neptune#fts ${luceneQueryKey}:*${luceneQueryVal}`);
            });
        }

        if (request.contains!==undefined) {
            request.contains.forEach(f=> {
                const luceneQueryKey = this.buildLuceneQueryKey(f.field, true);
                let luceneQueryVal = f.value.toString();
                [':', '/', ' '].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(char, 'g'), `\\${char}`);
                });
                ['[', ']'].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
                });
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has('*', `Neptune#fts ${luceneQueryKey}:*${luceneQueryVal}*`);
            });
        }

        if (request.exists!==undefined) {
            request.exists.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterEBase(f, traverser);
                traverser.has(f.field, f.value);
            });
        }

        if (request.nexists!==undefined) {
            request.nexists.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterEBaseNegated(f, traverser, f.field, f.value);
            });
        }

        if (request.fulltext!==undefined) {
            request.fulltext.forEach(f=> {
                // Remove any characters that would be recognized by Lucene as control characters.
                // Alternatively, could escape them but the standard query string analyzer will 
                // replace them with spaces anyway.
                let luceneQueryVal = f.value.toString();
                [':', '/', '\\[', '\\]'].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(char, 'g'), ' ');
                });
                // RegExp('\\\\') = regex for single backslash, '\\\\' = string with two backslashes
                luceneQueryVal = luceneQueryVal.replace(new RegExp('\\\\', 'g'), `\\\\`);
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has(f.field, `Neptune#fts ${luceneQueryVal}`);
            });
        }

        if (request.regex!==undefined) {
            request.regex.forEach(f=> {
                const luceneQueryKey = this.buildLuceneQueryKey(f.field, true);
                // Escape characters that can appear, escaped or unescaped, in regex but are also
                // control characters for Lucene. For example, "abc/def" is a valid regex but the contained
                // slash is interpreted by Lucene as the end of the regex. Square brackets [] must not
                // be escaped even though they denote range queries in Lucene because Lucene ignores
                // them inside of regexes.
                let luceneQueryVal = f.value.toString();
                [':', '/', ' '].forEach( char => {
                    luceneQueryVal = luceneQueryVal.replace(new RegExp(char, 'g'), `\\${char}`);
                });
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                traverser.has('*', `Neptune#fts ${luceneQueryKey}:/${luceneQueryVal}/`);
            });
        }

        if (request.lucene!==undefined) {
            request.lucene.forEach(f=> {
                traverser.select('a');
                this.buildSearchFilterVBase(f, traverser);
                // no escaping for Opensearch, user can send control characters and is responsible for  
                // escaping them in the search request when necessary
                traverser.has(f.field, `Neptune#fts ${f.value}`);
            });
        }

        // must reset all traversals so far as we may meed to use simplePath if FGAC is enabled to prevent cyclic checks
        traverser.select('a').dedup().fold().unfold().as('matched');

        // if authz is enabled, only return results that the user is authorized to view
        if (authorizedPaths!==undefined && authorizedPaths.length>0) {

            const authorizedPathIds = authorizedPaths.map(path=>`group___${path}`);
            traverser.
                local(
                    __.until(
                        __.hasId(process.P.within(authorizedPathIds))
                    ).repeat(
                        __.out().simplePath().dedup()
                    )
                ).as('authorization');
        }

        logger.debug(`search.enhanced.dao buildSearchTraverser: traverser: ${traverser.toString()}`);

        return traverser.select('matched').dedup();

    }

    private buildLuceneQueryKey(field: string, keyword?: boolean) : string {
        if (field === 'id') return 'entity_id';
        if (field === 'label') return 'entity_type';
        
        let components: string[] = [];
        components = ['predicates', field, 'value'];
        if (keyword) components.push('keyword');
        return components.join('.');
    }
}
