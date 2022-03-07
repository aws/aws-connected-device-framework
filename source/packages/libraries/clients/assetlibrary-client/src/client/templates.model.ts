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
export class TypeDefinitionModel {
	properties?: { [key: string]: {type: string|string[]; format?: string; enum?: string[] }};
    required?: string[];
    relations?: {
        out?: { [key: string]: RelationTarget[] };
        in?: { [key: string]: RelationTarget[] };
    };
    components?: string[];
}

export type RelationTarget = RelationTargetSimple | RelationTargetExpanded;
export type RelationTargetSimple = string;
export type RelationTargetExpanded = {
    name: string,
    includeInAuth?:boolean,
};
export class TypeResource extends TypeDefinitionModel {
    templateId: string;
    category: CategoryEnum;
}

export type CategoryEnum = 'device' | 'group';
export const CategoryEnum = {
    device: 'device' as CategoryEnum,
    group: 'group' as CategoryEnum
};

export type StatusEnum = 'draft' | 'published';
export const StatusEnum = {
    draft: 'draft' as StatusEnum,
    published: 'published' as StatusEnum
};

export class TypeResourceList {
    results: TypeResource[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}
