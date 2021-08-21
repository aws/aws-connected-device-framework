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
import { injectable } from 'inversify';
import {logger} from '../utils/logger';
import Ajv from 'ajv';
import { Operation } from '../types/constants';
import { TemplateDefinitionJson } from '../types/types.models';

@injectable()
export class SchemaValidatorService {

    private _validator = new Ajv({allErrors: true});

    public async validate(schemaId:string, jsonSchema: TemplateDefinitionJson, document: unknown, op:Operation  ): Promise<SchemaValidationResult> {
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
