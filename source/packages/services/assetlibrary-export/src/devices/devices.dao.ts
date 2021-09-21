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
import { Node } from '../data/node';
import { FullAssembler } from '../data/full.assembler';
import { BaseDaoFull } from '../data/base.full.dao';
import { isRelatedEntityDto, isVertexDto, RelatedEntityDto, VertexDto } from '../data/full.model';

const __ = process.statics;

@injectable()
export class DevicesDao extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
        @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async get(deviceIds:string[], expandComponents:boolean, attributes:string[], includeGroups:boolean): Promise<Node[]> {

        logger.debug(`device.full.dao get: in: deviceIds:${deviceIds}, expandComponents:${expandComponents}, attributes:${attributes}, includeGroups:${includeGroups}`);

        const dbIds:string[] = deviceIds.map(d=> `device___${d}`);

        // define the traversers that handle finding associated groups/components
        const relatedIn = __.inE();
        const relatedOut = __.outE();

        [relatedIn, relatedOut].forEach(t=> {
            if (expandComponents && !includeGroups) {
                t.hasLabel('component_of');
            } else if (!expandComponents && includeGroups) {
                t.not(__.hasLabel('component_of'));
            }
        });

        relatedIn.as('e')
            .outV().as('v')
            .valueMap().with_(process.withOptions.tokens).as('vProps')
            .constant('in').as('dir')
            .select('entityId','dir','e','vProps');

        relatedOut.as('e')
            .inV().as('v')
            .valueMap().with_(process.withOptions.tokens).as('vProps')
            .constant('out').as('dir')
            .select('entityId','dir','e','vProps');

        // build the traverser for returning the devices, optionally filtering the returned attributes
        const deviceProps = (attributes===undefined) ?
            __.select('devices').valueMap().with_(process.withOptions.tokens):
            __.select('devices').valueMap('state', 'deviceId', ...attributes).with_(process.withOptions.tokens);

        // build the main part of the query, unioning the related traversers with the main entity we want to return
        let results: process.Traverser[];
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(dbIds).as('devices')
                .values('deviceId').as('entityId')
                .select('devices').union(
                    relatedIn, relatedOut, deviceProps
                );

            // execute and retrieve the results
            logger.debug(`common.full.dao listRelated: traverser: ${JSON.stringify(traverser.toString())}`);
            results = await traverser.toList();
            logger.debug(`common.full.dao listRelated: results: ${JSON.stringify(results)}`);
        } finally {
            await conn.close();
        }

        if (results===undefined || results.length===0) {
            logger.debug(`device.full.dao get: exit: node: undefined`);
            return undefined;
        }
        logger.debug(`device.full.dao get: results: ${JSON.stringify(results)}`);

        // the result should contain verticesx representing the entities requested as individual rows, then all requested relations as other rows
        // find the main entities first
        const nodes: Node[] = [];
        const devices = results.filter(r=> isVertexDto(r)) as VertexDto[];
        devices.forEach(d=> {
            // construct the node
            const node = this.fullAssembler.assembleNode(d);
            // find any reltions for the device
            const relatedEntities = results.filter(r=> isRelatedEntityDto(r) && r.entityId===d['deviceId'][0])
                .map(r=> r as unknown as RelatedEntityDto);
            relatedEntities.forEach(r=> this.fullAssembler.assembleAssociation(node,r));
            nodes.push(node);
        });

        logger.debug(`device.full.dao get: exit: nodes: ${JSON.stringify(nodes)}`);
        return nodes;
    }

}
