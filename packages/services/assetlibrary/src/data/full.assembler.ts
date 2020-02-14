/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import {Node, NodeAttributeValue} from './node';
import { ModelAttributeValue } from './model';
import { TypeCategory } from '../types/constants';

@injectable()
export class FullAssembler {

    public assembleNode(entity:{ [key:string]: NodeAttributeValue}):Node {
        logger.debug(`full.assembler assembleNode: in: entity: ${JSON.stringify(entity)}`);

        const labels = (<string> entity['label']).split('::');
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

        // assemble all associated objects
        if (r.Es!==undefined) {
            for (let i=0; i<r.Es.length; i++) {
                const e = r.Es[i];
                const otherV = r.Vs[i];
                const direction = (e['inV']===node.id) ? 'in' : 'out';

                const l = (<string> otherV['label']).split('::');
                const other:Node= this.assembleNode(otherV);
                if (l.includes(TypeCategory.Group)) {
                    other.category = TypeCategory.Group;
                } else if (l.includes(TypeCategory.Component)) {
                    other.category = TypeCategory.Component;
                } if (l.includes(TypeCategory.Device)) {
                    other.category = TypeCategory.Device;
                }
                node.addLink(direction, <string>e['label'], other);
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
    Es: { [key:string]: NodeAttributeValue} [];
    Vs: { [key:string]: NodeAttributeValue} [];
}
