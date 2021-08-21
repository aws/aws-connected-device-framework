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

import { logger } from '../utils/logger';
import { TYPES } from '../di/types';

import { TypeModel,TypeDefinitionStatus } from './types.models';
import { TypeCategory } from './constants';
import { BaseDaoFull } from '../data/base.full.dao';
import { TypeRelationsModel, TypeVersionModel } from './types.models';

const __ = process.statics;

@injectable()
export class TypesDao extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async list(category:TypeCategory, status:TypeDefinitionStatus): Promise<TypeModel[]> {
        logger.debug(`types.full.dao list: in: category:${category}, status:${status}`);

        const superId = `type___${category}`;

        // only return published relations when we're looking at published definitions
        let relationsTraversal: process.GraphTraversal;
        if (status===TypeDefinitionStatus.draft) {
            relationsTraversal=__.bothE('relationship').valueMap().with_(process.withOptions.tokens).fold();
        } else {
            relationsTraversal=__.as('definition').bothE('relationship').
                match(
                    __.as('relationship').otherV().inE('current_definition').has('status',TypeDefinitionStatus.published).as('other')
                ).select('relationship').valueMap().with_(process.withOptions.tokens).fold();
        }

        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(superId).
                inE('super_type').outV().as('a');

            traverser.outE('current_definition').has('status',status).inV().as('def').
                project('type','definition','relations').
                    by(__.select('a').valueMap().with_(process.withOptions.tokens)).
                    by(__.select('def').valueMap().with_(process.withOptions.tokens).fold()).
                    by(relationsTraversal);

            results = await traverser.toList();
        } finally {
            conn.close();
        }

        logger.debug(`types.full.dao get: results: ${JSON.stringify(results)}`);

        if (results===undefined || results.length===0) {
            logger.debug(`types.full.dao list: exit: results: undefined`);
            return undefined;
        }

        const r:TypeModel[]=[];
        for(const result of results) {
            r.push( this.toModel(result, status, category));
        }

        logger.debug(`types.full.dao list: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

    private toModel(result: process.Traverser, status:TypeDefinitionStatus, category:TypeCategory): TypeModel {
        logger.debug(`types.full.dao toModel: in: result: ${JSON.stringify(result)}`);

        const json = JSON.parse( JSON.stringify(result));

        const definitionJson = json['definition'];
        if (definitionJson!==undefined && (<unknown[]>definitionJson).length>0) {

            const templateId = json['type']['templateId'][0];

            const definition = new TypeVersionModel();
            definition.status = status;
            definition.version = definitionJson[0]['version'][0];
            definition.definition = JSON.parse(definitionJson[0]['definition'][0]);

            const relationsJson = json['relations'];
            if (relationsJson!==undefined) {
                const relations = new TypeRelationsModel();
                for(const entry of relationsJson) {
                    const outTemplate = entry['fromTemplate'];
                    const inTemplate = entry['toTemplate'];
                    const relationship = entry['name'];

                    const direction = (templateId===outTemplate) ? 'out' : 'in';

                    if (outTemplate===inTemplate) {
                        // self link
                        if ( relations.outgoingIncludes(relationship,inTemplate)) {
                            relations.addIncoming(relationship, outTemplate);
                        } else {
                            relations.addOutgoing(relationship, inTemplate);
                        }
                    } else if (direction==='out') {
                        // outgoing link
                        relations.addOutgoing(relationship, inTemplate);
                    } else {
                        // incoming link
                        relations.addIncoming(relationship, outTemplate);
                    }
                }
                definition.relations=relations;
            }

            const model = new TypeModel();
            model.templateId = templateId;
            model.category = category;
            model.schema = definition;

            logger.debug(`types.full.dao toModel: exit: model: ${JSON.stringify(model)}`);
            return model;
        } else {
            logger.debug(`types.full.dao toModel: exit: type status not found`);
            return undefined;
        }
    }

}
