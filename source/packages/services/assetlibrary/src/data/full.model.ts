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
import { NodeAttributeValue } from './node';

export interface VertexDto {
    id: string;
    label: string;
    [key: string]: NodeAttributeValue;
}
export interface EdgeDto {
    id: string;
    label: string;
    outV: {
        id: string;
        label: string;
    };
    inV: {
        id: string;
        label: string;
    };
    properties: { [key: string]: NodeAttributeValue };
}

export type RelationDirection = 'in' | 'out';
export interface RelatedEntityDto {
    entityId?: string;
    dir: RelationDirection;
    e: EdgeDto;
    vProps: VertexDto;
}

export function isVertexDto(potential: unknown): potential is VertexDto {
    const castPotential = potential as VertexDto;
    return (
        castPotential.id !== undefined &&
        castPotential.label !== undefined &&
        !isRelatedEntityDto(potential)
    );
}

export function isRelatedEntityDto(potential: unknown): potential is RelatedEntityDto {
    const castPotential = potential as RelatedEntityDto;
    return (
        castPotential.dir !== undefined &&
        castPotential.e !== undefined &&
        castPotential.vProps !== undefined
    );
}
