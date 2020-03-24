/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process, structure } from 'gremlin';
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node} from './node';
import { FullAssembler, NodeDto } from './full.assembler';
import { ModelAttributeValue } from './model';
import { BaseDaoFull } from './base.full.dao';

const __ = process.statics;

@injectable()
export class CommonDaoFull extends BaseDaoFull {

    public constructor(
        @inject('neptuneUrl') neptuneUrl: string,
        @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler,
	    @inject(TYPES.GraphSourceFactory) graphSourceFactory: () => structure.Graph
    ) {
        super(neptuneUrl, graphSourceFactory);
    }

    public async listRelated(entityDbId: string, relationship: string, direction:string, template:string, filterRelatedBy:{ [key: string] : ModelAttributeValue}, offset:number, count:number) : Promise<Node> {
        logger.debug(`common.full.dao listRelated: in: entityDbId:${entityDbId}, relationship:${relationship}, direction:${direction}, template:${template}, filterRelatedBy:${JSON.stringify(filterRelatedBy)}, offset:${offset}, count:${count}`);

        // build the queries for returning the info we need to assemble related groups/devices
        const connectedEdgesIn = __.inE();
        const connectedEdgesOut = __.outE();
        const connectedVerticesIn = __.inE().otherV();
        const connectedVerticesOut = __.outE().otherV();

        if (relationship==='*') {
            relationship=undefined;
        }

        if (relationship) {
            connectedEdgesIn.hasLabel(relationship);
            connectedEdgesOut.hasLabel(relationship);
        }

        const connectedEdgesFilter = __.otherV().hasLabel(template);
        if (filterRelatedBy!==undefined) {
            Object.keys(filterRelatedBy).forEach(k=> {
                connectedVerticesIn.has(k, filterRelatedBy[k]);
                connectedVerticesOut.has(k, filterRelatedBy[k]);
                connectedEdgesFilter.has(k, filterRelatedBy[k]);
            });
        }
        connectedEdgesIn.where(connectedEdgesFilter).valueMap().with_(process.withOptions.tokens);
        connectedEdgesOut.where(connectedEdgesFilter).valueMap().with_(process.withOptions.tokens);
        connectedVerticesIn.hasLabel(template);
        connectedVerticesOut.hasLabel(template);

        // apply pagination
        if (offset!==undefined && count!==undefined) {
            // note: workaround for weird typescript issue. even though offset/count are declared as numbers
            // throughout, they are being interpreted as strings within gremlin, therefore need to force to int beforehand
            const offsetAsInt = parseInt(offset.toString(),0);
            const countAsInt = parseInt(count.toString(),0);
            connectedEdgesIn.range(offsetAsInt, offsetAsInt + countAsInt);
            connectedEdgesOut.range(offsetAsInt, offsetAsInt + countAsInt);
            connectedVerticesIn.range(offsetAsInt, offsetAsInt + countAsInt);
            connectedVerticesOut.range(offsetAsInt, offsetAsInt + countAsInt);
        }

        // fold the results into an array
        connectedEdgesIn.fold();
        connectedEdgesOut.fold();
        connectedVerticesIn.valueMap().with_(process.withOptions.tokens).fold();
        connectedVerticesOut.valueMap().with_(process.withOptions.tokens).fold();

        // assemble the main query
        let results;
        const conn = super.getConnection();
        try {
            const traverser = conn.traversal.V(entityDbId);

            if (direction==='in') {
                traverser.project('object','EsIn','VsIn').
                by(__.valueMap().with_(process.withOptions.tokens)).
                by(connectedEdgesIn).
                by(connectedVerticesIn);
            } else if (direction==='out') {
                traverser.project('object','EsOut','VsOut').
                by(__.valueMap().with_(process.withOptions.tokens)).
                by(connectedEdgesOut).
                by(connectedVerticesOut);
            } else {
                traverser.project('object','EsIn','EsOut','VsIn','VsOut').
                by(__.valueMap().with_(process.withOptions.tokens)).
                by(connectedEdgesIn).
                by(connectedEdgesOut).
                by(connectedVerticesIn).
                by(connectedVerticesOut);
            }

            // execute and retrieve the results
            logger.debug(`common.full.dao listRelated: traverser: ${traverser}`);
            results = await traverser.toList();
            logger.debug(`common.full.dao listRelated: results: ${JSON.stringify(results)}`);
        } finally {
            conn.close();
        }

        if (results===undefined || results.length===0) {
            logger.debug(`common.full.dao listRelated: exit: node: undefined`);
            return undefined;
        }

        // there should be only one result as its by entity id, but we still process as an array so we can reuse the existing assemble methods
        const nodes: Node[] = [];
        for(const result of results) {
            const r = JSON.parse(JSON.stringify(result)) as NodeDto;

            // assemble the device
            let node: Node;
            if (r) {
                node = this.fullAssembler.assembleNode(r.object);
                this.fullAssembler.assembleAssociations(node, r);
            }
            nodes.push(node);
        }

        logger.debug(`common.full.dao listRelated: exit: node: ${JSON.stringify(nodes[0])}`);
        return nodes[0];

    }

    public async getLabels(entityDbId: string): Promise<string[]> {
        logger.debug(`common.full.dao getLabels: in: entityDbId: ${entityDbId}`);

        let labelResults;
        const conn = super.getConnection();
        try {
            labelResults = await conn.traversal.V(entityDbId).label().toList();
        } finally {
            conn.close();
        }

        if (labelResults===undefined || labelResults.length===0) {
            logger.debug('common.full.dao getLabels: exit: labels:undefined');
            return undefined;
        } else {
            const labels:string[] = JSON.parse(JSON.stringify(labelResults)) as string[];
            if (labels.length===1) {
                // all devices/groups should have 2 labels
                // if only 1 is returned it is an older version of the Neptune engine
                // which returns labels as a concatinated string (label1::label2)
                // attempt to be compatable with this
                const splitLabels:string[] = labels[0].split('::');
                if (splitLabels.length < 2) {
                    logger.error(`common.full.dao getLabels: entityDbId ${entityDbId} does not have correct labels`);
                    throw new Error('INVALID_LABELS');
                }
                logger.debug(`common.full.dao getLabels: exit: labels: ${labels}`);
                return labels;
            } else {
                logger.debug(`common.full.dao getLabels: exit: labels: ${labels}`);
                return labels;
            }
        }
    }
}
