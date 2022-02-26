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
import {Node, NodeAttributeValue} from './node';
import { ModelAttributeValue } from './model';
import { RelatedEntityDto, VertexDto } from './full.model';

@injectable()
export class LiteAssembler {

    public assembleNode(_entity:VertexDto):Node {
        throw new Error('NOT_IMPLEMENTED');
    }

    public assembleAssociation(_node:Node, _r:RelatedEntityDto) {
        throw new Error('NOT_IMPLEMENTED');
    }

    public extractPropertyValue(v: NodeAttributeValue): ModelAttributeValue {
        if (Array.isArray(v)) {
            return v[0];
        } else {
            return v;
        }
    }

}

