/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {NodeAttributeValue} from './node';

export interface VertexDto {
    id: string;
    label: string;
    [key:string]: NodeAttributeValue;
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
    properties: {[key:string]: NodeAttributeValue};
}

export type RelationDirection = 'in' | 'out';
export interface RelatedEntityDto {
    entityId?: string;
    dir:RelationDirection;
    e: EdgeDto;
    vProps: VertexDto;
}

export function isVertexDto(potential: unknown): potential is VertexDto {
    const castPotential = potential as VertexDto;
    return castPotential.id!==undefined && castPotential.label!==undefined
        && !isRelatedEntityDto(potential);
}

export function isRelatedEntityDto(potential: unknown): potential is RelatedEntityDto {
    const castPotential = potential as RelatedEntityDto;
    return (castPotential.dir!==undefined
        && castPotential.e!==undefined
        && castPotential.vProps!==undefined);
}
