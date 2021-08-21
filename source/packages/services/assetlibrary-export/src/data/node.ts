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

import { TypeCategory } from '../types/constants';

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

    public addLink(direction:string, name:string, other:Node): void {
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
