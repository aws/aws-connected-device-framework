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
import { InvalidQueryStringError } from '../utils/errors';
import { NodeAttributeValue } from './node';
export type ModelAttributeValue = string | number | boolean;

export type StringArrayMap = { [key: string]: string[] };
export type RelatedEntity = { id: string; isAuthCheck?: boolean };
export type RelatedEntityArrayMap = { [key: string]: RelatedEntity[] };

export type DirectionToStringArrayMap = {
    in?: StringArrayMap;
    out?: StringArrayMap;
};
export type DirectionToRelatedEntityArrayMap = {
    in?: RelatedEntityArrayMap;
    out?: RelatedEntityArrayMap;
};

export type SortDirection = 'ASC' | 'DESC';
export type SortKey = {
    field: string;
    direction: SortDirection;
};
export type SortKeys = SortKey[];
export function assembleSortKeys(sort?: string | string[]): SortKeys {
    if (sort === undefined) {
        return undefined;
    }
    const sk: SortKeys = [];

    let items: string[];
    if (Array.isArray(sort)) {
        items = sort;
    } else if (typeof sort === 'string') {
        items = sort.split(',');
    }

    items.forEach((i) => {
        const j = i.split(':');
        const field = j[0];
        let direction: SortDirection =
            j.length === 2 ? (j[1].toUpperCase() as SortDirection) : undefined;
        if (direction !== 'ASC' && direction !== 'DESC') {
            direction = 'ASC';
        }
        sk.push({ field, direction });
    });
    if (sk.length > 100) {
        throw new InvalidQueryStringError('Sort keys must not exceed 100 items');
    }
    return sk;
}

export function safeExtractLabels(rawLabelAttribute: NodeAttributeValue): string[] {
    let labels: string[] = [];
    if (Array.isArray(rawLabelAttribute) && rawLabelAttribute.length >= 2) {
        labels.push(...(<string[]>rawLabelAttribute));
    } else if (Array.isArray(rawLabelAttribute)) {
        labels.push(...(<string>rawLabelAttribute[0]).split('::'));
    } else {
        labels = (<string>rawLabelAttribute).split('::');
    }
    return labels;
}

export interface EntityTypeMap {
    [id: string]: string[];
}

export type RelationDirection = 'in' | 'out';
export type OmniRelationDirection = RelationDirection | 'both';

export interface RelatedEntityIdentifer {
    relationship: string;
    direction: RelationDirection;
    targetId: string;
}
