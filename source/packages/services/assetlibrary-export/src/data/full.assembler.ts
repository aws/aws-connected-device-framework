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
import 'reflect-metadata';

import { injectable } from 'inversify';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TypeCategory } from '../types/constants';
import { RelatedEntityDto, VertexDto } from './full.model';
import { ModelAttributeValue, safeExtractLabels } from './model';
import { Node, NodeAttributeValue } from './node';

@injectable()
export class FullAssembler {
    public assembleNode(entity: VertexDto): Node {
        logger.silly(`full.assembler assembleNode: in: entity: ${JSON.stringify(entity)}`);

        const labels = safeExtractLabels(entity['label']);
        const node = new Node();
        Object.keys(entity).forEach((key) => {
            if (key === 'id') {
                node.id = <string>entity[key];
            } else if (key === 'label') {
                node.types = labels;
            } else {
                node.attributes[key] = entity[key];
            }
        });

        logger.silly(`full.assembler assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public assembleAssociation(node: Node, r: RelatedEntityDto): void {
        logger.silly(`full.assembler assembleAssociation: in: r:${JSON.stringify(r)}`);

        const l = safeExtractLabels(r.vProps.label);
        const other: Node = this.assembleNode(r.vProps);
        if (l.includes(TypeCategory.Group)) {
            other.category = TypeCategory.Group;
        } else if (l.includes(TypeCategory.Component)) {
            other.category = TypeCategory.Component;
        } else if (l.includes(TypeCategory.Device)) {
            other.category = TypeCategory.Device;
        }
        node.addLink(r.dir, r.e.label, other);
        logger.silly(`full.assembler assembleAssociation: exit: ${JSON.stringify(node)}`);
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
    object: { [key: string]: NodeAttributeValue };
    EsIn: { [key: string]: NodeAttributeValue }[];
    EsOut: { [key: string]: NodeAttributeValue }[];
    VsIn: { [key: string]: NodeAttributeValue }[];
    VsOut: { [key: string]: NodeAttributeValue }[];
}
