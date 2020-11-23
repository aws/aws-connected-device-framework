import { NodeAttributeValue } from './node';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export type ModelAttributeValue = string | number | boolean;

export type StringToArrayMap = { [key: string] : string[]};

export type DirectionStringToArrayMap = {
	in?: StringToArrayMap,
	out?: StringToArrayMap
};

export type SortDirection = 'ASC' | 'DESC';
export type SortKey = {
    field:string,
    direction: SortDirection;
};
export type SortKeys = SortKey[];
export function assembleSortKeys(sort?:string) : SortKeys {
    if (sort===undefined) {
        return undefined;
    }
    const sk:SortKeys = [];
    const items = sort.split(',');
    items.forEach(i=> {
        const j = i.split(':');
        const field = j[0];
        let direction:SortDirection = (j.length===2) ? (j[1].toUpperCase() as SortDirection) : undefined;
        if (direction!=='ASC' && direction!=='DESC') {
            direction='ASC';
        }
        sk.push({field, direction});
    });
    return sk;
}

export function applyMixins(derivedCtor: any, baseCtors: any[]) {
    baseCtors.forEach(baseCtor => {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
            Object.defineProperty(derivedCtor.prototype, name, Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
        });
    });
}

export function safeExtractLabels(rawLabelAttribute:NodeAttributeValue) : string[] {
    let labels: string[] = [];
    if (Array.isArray(rawLabelAttribute) && rawLabelAttribute.length>=2) {
        labels.push(... <string[]> rawLabelAttribute);
    } else if (Array.isArray(rawLabelAttribute)) {
        labels.push(...(<string>rawLabelAttribute[0]).split('::'));
    } else {
        labels = (<string> rawLabelAttribute).split('::');
    }
    return labels;
}
