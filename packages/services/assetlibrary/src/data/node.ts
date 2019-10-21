import { TypeCategory } from '../types/constants';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export type NodeAttributeValue = string | string[] | number | number[] | boolean | boolean[];
export type StringNodeMap = { [key: string] : Node[]} ;
export class Node {
    id?:string;
    types: string[];
    category:TypeCategory;

    attributes?: { [key: string] : NodeAttributeValue} = {};

    in: StringNodeMap = {};
    out: StringNodeMap = {};

    // used for optimistic locking in 'lite' mode
    version?: number;

    constructor() {
        this.types = [];
    }

    public addLink(direction:string, name:string, other:Node) {
        if (direction==='in') {
            if (this['in'][name]===undefined) {
                this['in'][name] = [];
            }
            this['in'][name].push(other);
        } else if (direction==='out') {
            if (this['out'][name]===undefined) {
                this['out'][name] = [];
            }
            this['out'][name].push(other);
        }
    }
}
