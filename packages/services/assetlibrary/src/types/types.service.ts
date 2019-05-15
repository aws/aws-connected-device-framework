/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { TypeModel, TypeDefinitionModel} from './types.models';
import { SchemaValidationResult } from '../utils/schemaValidator.service';
import {TypeCategory, Operation} from './constants';

export interface TypesService {

    validateSubType(templateId:string, category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult>;

    validateType(category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult>;

    get(templateId: string, category: TypeCategory, status: string): Promise<TypeModel>;

    list(category:TypeCategory, status:string, offset?:number, count?:number): Promise<TypeModel[]>;

    create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    delete(templateId:string, category:TypeCategory): Promise<void> ;

    update(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    publish(templateId:string, category:TypeCategory): Promise<void>;

    validateRelationshipsByType(templateId:string, out:{ [key: string] : string[]}): Promise<boolean>;

    validateRelationshipsByPath(templateId:string, out:{ [key: string] : string[]}): Promise<boolean>;

}
