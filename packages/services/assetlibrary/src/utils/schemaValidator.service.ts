/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import Ajv from 'ajv';
import { Operation } from '../types/constants';

@injectable()
export class SchemaValidatorService {

    private _validator = new Ajv({allErrors: true});

    public async validate(schemaId:string, jsonSchema: object, document: object, op:Operation  ): Promise<SchemaValidationResult> {
        logger.debug(`schemaValidator.service validate: in: schemaId:${schemaId}, jsonSchema:${JSON.stringify(jsonSchema)}, document:${JSON.stringify(document)}, op:${op}`);

        // remove any undefined properties from the input document
        const docAsJson = JSON.parse(JSON.stringify(document));
        Object.keys(docAsJson).forEach(k => {
            if (docAsJson[k]===undefined) {
                delete docAsJson[k];
            }
        });
        document = docAsJson;

        // if its an update, validation may be different there always compile rather than use existing
        this._validator.removeSchema(schemaId);
        const validate = this._validator.compile(jsonSchema);

        const result = new SchemaValidationResult();
        const valid= await validate(document);
        if (valid) {
            result.isValid = true;
        } else {
            // make the error messages as friendly as possibly, extracting what's useful from the errors
            logger.debug(`schemaValidator.service validate: validate.errors: ${JSON.stringify(validate.errors)}`);
            result.isValid = false;
            validate.errors.forEach( (err) => {
                if (err.keyword==='required' && err.dataPath==='') {
                    result.errors[ (err.params as  Ajv.DependenciesParams).missingProperty] = err.message;
                } if (err.keyword==='additionalProperties') {
                    result.errors[`${err.dataPath} ${err.params}`] = err.message;
                } else {
                    result.errors[ err.dataPath] = err.message;
                }
            });
        }

        logger.debug(`schemaValidator.service validate: exit: result: ${JSON.stringify(result)}`);

        return result;
    }
}

export class SchemaValidationResult {
    isValid: boolean;
	errors?: { [dataPath: string] : string} = {};
}
