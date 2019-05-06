/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { process } from 'gremlin';
import {logger} from '../utils/logger';
import {Node} from './node';
import { ThingDocument, ThingGroupDocument } from 'aws-sdk/clients/iot';
import { TypeCategory } from '../types/constants';
import { injectable } from 'inversify';

@injectable()
export class NodeAssembler {

    public toNode(result: process.Traverser, labels: string[]): Node {
        logger.debug(`assembler toNode: in: result: ${result}, labels: ${labels}`);

        const node = new Node();
        Object.keys(result).forEach( key => {
            if (key==='id') {
                node.id = <string> result[key];
            } else if (key==='label') {
                node.types = labels;
            } else {
                node.attributes[key] = result[key] ;
            }
        });

        logger.debug(`assembler toNode: exit: node: ${node}`);
        return node;
    }

    public toNodeFromThingDocument(result: ThingDocument): Node {
        logger.debug(`assembler toNodeFromThingDocument: in: result: ${JSON.stringify(result)}`);

        const node = new Node();
        node.id = result.thingName;
        node.attributes['deviceId']=result.thingName;
        node.category=TypeCategory.Device;
        node.types.push(TypeCategory.Device);
        node.types.push(result.thingTypeName);

        if (result.attributes) {
            Object.keys(result.attributes).forEach( key => {
                node.attributes[key] = result.attributes[key] ;
            });
        }

        logger.debug(`assembler toNodeFromThingDocument: exit: node: ${node}`);
        return node;
    }

    public toNodeFromThingGroupDocument(result: ThingGroupDocument): Node {
        logger.debug(`assembler toNodeFromThingGroupDocument: in: result: ${JSON.stringify(result)}`);

        const node = new Node();
        node.id = result.thingGroupName;
        node.attributes['groupPath']=result.thingGroupName;
        node.category=TypeCategory.Group;
        node.types.push(TypeCategory.Group);
        node.attributes['parentGroup']=result.parentGroupNames;

        if (result.attributes) {
            Object.keys(result.attributes).forEach( key => {
                node.attributes[key] = result.attributes[key] ;
            });
        }

        logger.debug(`assembler toNodeFromThingGroupDocument: exit: node: ${node}`);
        return node;
    }

}
