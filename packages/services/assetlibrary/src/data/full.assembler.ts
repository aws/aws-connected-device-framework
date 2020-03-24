/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import {Node, NodeAttributeValue} from './node';
import { ModelAttributeValue, safeExtractLabels } from './model';
import { TypeCategory } from '../types/constants';

@injectable()
export class FullAssembler {

    public assembleNode(entity:{ [key:string]: NodeAttributeValue}):Node {
        logger.debug(`full.assembler assembleNode: in: entity: ${JSON.stringify(entity)}`);

        const labels = safeExtractLabels(entity['label']);
        const node = new Node();
        Object.keys(entity).forEach( key => {
            if (key==='id') {
                node.id = <string> entity[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = entity[key] ;
            }
        });

        logger.debug(`full.assembler assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public assembleAssociations(node:Node, r:NodeDto) {
        logger.debug(`full.assembler assembleAssociations: in: r:${JSON.stringify(r)}`);

        const rels:{
            e: { [key:string]: NodeAttributeValue},
            otherV: { [key:string]: NodeAttributeValue},
            direction: string
        }[] = [];

        // assemble all associated objects
        if (r.EsIn!==undefined) {
            for (let i=0; i<r.EsIn.length; i++) {
                const e = r.EsIn[i];
                const otherV = r.VsIn[i];
                const direction = 'in';
                rels.push({e, otherV, direction});
            }
        }

        if (r.EsOut!==undefined) {
            for (let i=0; i<r.EsOut.length; i++) {
                const e = r.EsOut[i];
                const otherV = r.VsOut[i];
                const direction = 'out';
                rels.push({e, otherV, direction});
            }
        }

        for(const rel of rels) {
            if (rel.e && rel.otherV) {
                const l = safeExtractLabels(rel.otherV['label']);
                const other: Node = this.assembleNode(rel.otherV);
                if (l.includes(TypeCategory.Group)) {
                    other.category = TypeCategory.Group;
                } else if (l.includes(TypeCategory.Component)) {
                    other.category = TypeCategory.Component;
                }
                if (l.includes(TypeCategory.Device)) {
                    other.category = TypeCategory.Device;
                }
                node.addLink(rel.direction, <string>rel.e['label'], other);
            } else {
                logger.warn(`full.assembler assembleAssociations: either edge or vertex is missing: e::${JSON.stringify(rel.e)}, otherV:${JSON.stringify(rel.otherV)}`);
            }
        }

        logger.debug(`full.assembler assembleAssociations: exit: ${JSON.stringify(node)}`);
    }

    public extractPropertyValue(v: NodeAttributeValue): ModelAttributeValue {
        if (Array.isArray(v)) {
            return v[0];
        } else {
            return v;
        }
    }

}

export interface NodeDto {
    object: { [key:string]: NodeAttributeValue};
    EsIn: { [key:string]: NodeAttributeValue} [];
    EsOut: { [key:string]: NodeAttributeValue} [];
    VsIn: { [key:string]: NodeAttributeValue} [];
    VsOut: { [key:string]: NodeAttributeValue} [];
}
