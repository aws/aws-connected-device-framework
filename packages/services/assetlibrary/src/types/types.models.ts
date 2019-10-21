import { TypeCategory } from './constants';

/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export class TypeModel {
    templateId: string;
    category: TypeCategory;
	schema: TypeVersionModel;
}

export class TypeVersionModel {
	version: number;
    definition: TypeDefinitionModel;
    status: TypeDefinitionStatus;
    relations: TypeRelationsModel;
}

export class TypeDefinitionModel {
	properties?: {
        [key: string]: {
            type: string[]
        }
    };
	// properties?: { [key: string]: string|string[] };
    required?: string[];
    relations?: {
        out?: { [key: string]: string[] },
        in?: { [key: string]: string[] }
    };
    components?: string[];
    messagePayload?: MessagePayloadDefinition;
}

export class TypeRelationsModel {
	out?: { [key: string]: string[] };
    in?: { [key: string]: string[] };
}

export class TypeResource extends TypeDefinitionModel {
    templateId: string;
    category: TypeCategory;
}

export class TypeResourceList {
    results: TypeResource[]=[];
    pagination?: {
        offset:number;
        count:number;
    };
}

export class MessagePayloadDefinition {
    timeStampAttributeName: string;
	properties: { [key: string]: string|number|boolean };
    required?: string[];
    periodicFrequency: number;
}

export enum TypeDefinitionStatus {
    draft='draft',
    published='published',
    deprecated='deprecated'
}
