/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 */

export class TypeDefinitionModel {
	properties?: { [key: string]: {type: string|string[] }};
    required?: string[];
    relations?: {
        out?: { [key: string]: string[] },
        in?: { [key: string]: string[] }
    };
    components?: string[];
}

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
