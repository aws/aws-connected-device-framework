/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';

import {TypeModel, TypeVersionModel, TypeDefinitionModel, TypeDefinitionStatus } from './types.models';
import { TYPES } from '../di/types';
import { Iot } from 'aws-sdk';
import { ThingTypeDefinition } from 'aws-sdk/clients/iot';
import { TypeCategory } from './constants';

@injectable()
export class TypesDaoLite {

    private readonly iot: AWS.Iot;
    /**
     * Constructor
     * @param {string} awsRegion
     */
    constructor(@inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
         this.iot = iotFactory();
    }

    public async create(model: TypeModel): Promise<void> {
        logger.debug(`types.lite.dao create: in: model: ${JSON.stringify(model)}`);

        const params:Iot.Types.CreateThingTypeRequest = {
            thingTypeName: model.templateId,
            thingTypeProperties: {}
        };

        if (model.schema.definition.properties) {
            params.thingTypeProperties.searchableAttributes=[];
            for (const key of Object.keys(model.schema.definition.properties)) {
                params.thingTypeProperties.searchableAttributes.push(key);
            }
        }

        await this.iot.createThingType(params).promise();
    }

    public async list(): Promise<TypeModel[]> {
        logger.debug(`types.lite.dao list: in:`);

        const results = await this.iot.listThingTypes().promise();

        logger.debug(`types.lite.dao list: results: ${JSON.stringify(results)}`);

        const r:TypeModel[]=[];
        for(const result of results.thingTypes) {
            r.push( this.toModel(result, TypeCategory.Device));
        }

        logger.debug(`types.lite.dao list: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public async get(thingTypeName:string): Promise<TypeModel> {
        logger.debug(`types.lite.dao get: in: ${thingTypeName}`);

        const result = await this.iot.describeThingType({thingTypeName}).promise();

        logger.debug(`types.lite.dao get: result: ${JSON.stringify(result)}`);

        const r = this.toModel(result, TypeCategory.Device);

        logger.debug(`types.lite.dao get: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public async deprecate(thingTypeName:string): Promise<void> {
        logger.debug(`types.lite.dao deprecate: in: ${thingTypeName}`);

        await this.iot.deprecateThingType({thingTypeName}).promise();

        logger.debug(`types.lite.dao deprecate: exit:`);
    }

    private toModel(result: ThingTypeDefinition, category:TypeCategory): TypeModel {
        logger.debug(`types.lite.dao toModel: in: result: ${JSON.stringify(result)}`);

        const definition = new TypeDefinitionModel();
        const searchableAttributes = result.thingTypeProperties.searchableAttributes;
        if (searchableAttributes) {
            definition.properties= {};
            for(const attr of searchableAttributes) {
                definition.properties[attr]= {type: ['string']};
            }
        }

        const version = new TypeVersionModel();
        version.definition = definition;
        if (result.thingTypeMetadata && result.thingTypeMetadata.deprecated===true) {
            version.status=TypeDefinitionStatus.deprecated;
        }

        const model = new TypeModel();
        model.templateId = result.thingTypeName;
        model.category = category;
        model.schema = version;

        logger.debug(`types.lite.dao toModel: exit: ${JSON.stringify(model)}`);
        return model;

    }

}
