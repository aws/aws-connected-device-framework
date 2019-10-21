/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { TypeModel, TypeDefinitionModel, TypeDefinitionStatus} from './types.models';
import { SchemaValidationResult } from '../utils/schemaValidator.service';
import {TypeCategory, Operation} from './constants';
import { DirectionStringToArrayMap } from '../data/model';

export interface TypesService {

    validateSubType(templateId:string, category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult>;

    validateType(category:TypeCategory, document:object, op:Operation): Promise<SchemaValidationResult>;

    get(templateId: string, category: TypeCategory, status: TypeDefinitionStatus): Promise<TypeModel>;

    list(category:TypeCategory, status:TypeDefinitionStatus, offset?:number, count?:number): Promise<TypeModel[]>;

    create(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    delete(templateId:string, category:TypeCategory): Promise<void> ;

    update(templateId:string, category:TypeCategory, definition:TypeDefinitionModel): Promise<SchemaValidationResult>;

    publish(templateId:string, category:TypeCategory): Promise<void>;

    validateRelationshipsByType(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean>;

    validateRelationshipsByPath(templateId:string, rels:DirectionStringToArrayMap): Promise<boolean>;

}
