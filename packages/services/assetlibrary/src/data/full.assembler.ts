/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import {Node, NodeAttributeValue} from './node';
import {TypeCategory} from '../types/constants';
import { ModelAttributeValue } from './model';

@injectable()
export class FullAssembler {

    public assembleDeviceNode(device:{ [key:string]: NodeAttributeValue}):Node {
        logger.debug(`full.assembler assembleDeviceNode: in: device: ${JSON.stringify(device)}`);

        const labels = (<string> device['label']).split('::');
        const node = new Node();
        Object.keys(device).forEach( key => {
            if (key==='id') {
                node.id = <string> device[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = device[key] ;
            }
        });

        logger.debug(`full.assembler assembleDeviceNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public assembleGroupNode(group:{ [key:string]: NodeAttributeValue}):Node {
        logger.debug(`full.assembler assembleGroupNode: in: group: ${JSON.stringify(group)}`);

        const labels = (<string> group['label']).split('::');
        const node = new Node();
        Object.keys(group).forEach( key => {
            if (key==='id') {
                node.id = <string> group[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = group[key] ;
            }
        });

        logger.debug(`full.assembler assembleGroupNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public assembleAssociations(node:Node, r:NodeDto) {
        logger.debug(`full.assembler assembleAssociations: in: r:${JSON.stringify(r)}`);

        // assemble all associated objects
        if (r.pathsIn!==undefined) {
            r.pathsIn.forEach((path)=> {
                this.assembleAssociation(node, r, path, 'in');
            });
        }
        if (r.pathsOut!==undefined) {
            r.pathsOut.forEach((path)=> {
                this.assembleAssociation(node, r, path, 'out');
            });
        }

        logger.debug(`full.assembler assembleAssociations: exit: ${JSON.stringify(node)}`);
    }

    private assembleAssociation(node:Node, r:NodeDto, path:{objects:string[]}, direction:string) {
        const eId = path.objects[1];
        const vId = path.objects[2];
        const e = (r.Es!==undefined && r.Es!==null) ? r.Es.filter(edge=> edge.id===eId) : [];
        const v = (r.Vs!==undefined && r.Vs!==null) ? r.Vs.filter(vertex=> vertex.id===vId): [];

        if (v[0]!==undefined && e[0]!==undefined) {
            const l = (<string> v[0]['label']).split('::');
            let other:Node;
            if (l.includes(TypeCategory.Group)) {
                other = this.assembleGroupNode(v[0]);
                other.category = TypeCategory.Group;
            } else if (l.includes(TypeCategory.Component)) {
                other = this.assembleDeviceNode(v[0]);
                other.category = TypeCategory.Component;
            } if (l.includes(TypeCategory.Device)) {
                other = this.assembleDeviceNode(v[0]);
                other.category = TypeCategory.Device;
            }
            node.addLink(direction, e[0]['label'], other);
        }
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
    pathsIn: {
        objects:string[];
    }[];
    pathsOut: {
        objects:string[];
    }[];
    Es: {
        label:string;
        id:string;
    }[];
    Vs: { [key:string]: NodeAttributeValue} [];
}
