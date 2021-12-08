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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyMixins(derivedCtor: any, baseCtors: any[]) : void{
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
