/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';

import { SchemaValidatorService } from './schemaValidator.service';
import { Operation } from '../types/constants';

describe('SchemaValidatorService', () => {
    let instance: SchemaValidatorService;
    let superTypeSchema: any;
    let specializedTypeSchema: any;
    let toValidate: any;

    beforeEach(() => {
        instance = new SchemaValidatorService();
        superTypeSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/types/definitions/device.schema.json'), {encoding: 'utf8'}));
        specializedTypeSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/utils/testResources/test.schema.json'), {encoding: 'utf8'}));
        superTypeSchema.definitions.subType.properties = specializedTypeSchema.properties;
        superTypeSchema.definitions.subType.required = specializedTypeSchema.required;

        // no components...
        delete superTypeSchema.properties.components;
        delete superTypeSchema.definitions.componentTypes;

        // init the test input
        toValidate = {
            deviceId: 'device-001',
            templateId: 'test',
            attributes: {
                requiredTest: 'abc'
            }
        };

    });

    it('valid json against schema should return true - requiredTest', async () => {
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - integerTest1', async () => {
        toValidate.attributes.integerTest1 = 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest1', async () => {
        toValidate.attributes.integerTest1 = 'invalid';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - integerTest2', async () => {
        toValidate.attributes.integerTest2= 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 1', async () => {
        toValidate.attributes.integerTest2= 3;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 2', async () => {
        toValidate.attributes.integerTest2= 55;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 3', async () => {
        toValidate.attributes.integerTest2= 43;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - integerTest3 - 1', async () => {
        toValidate.attributes.integerTest3= 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest3 - 1', async () => {
        toValidate.attributes.integerTest3= 5;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest3 - 2', async () => {
        toValidate.attributes.integerTest3= 50;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - integerTest4', async () => {
        toValidate.attributes.integerTest4= 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest4', async () => {
        toValidate.attributes.integerTest4= 2;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest1', async () => {
        toValidate.attributes.numberTest1= 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest1', async () => {
        toValidate.attributes.numberTest1= 'invalid';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest2', async () => {
        toValidate.attributes.numberTest2= 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 1', async () => {
        toValidate.attributes.numberTest2= 3;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 2', async () => {
        toValidate.attributes.numberTest2= 55;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 3', async () => {
        toValidate.attributes.numberTest2= 43;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest3 - 1', async () => {
        toValidate.attributes.numberTest3= 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest3 - 1', async () => {
        toValidate.attributes.numberTest3= 5;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest3 - 2', async () => {
        toValidate.attributes.numberTest3= 50;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest4', async () => {
        toValidate.attributes.numberTest4= 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest4', async () => {
        toValidate.attributes.numberTest4= 2;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest1', async () => {
        toValidate.attributes.stringTest1= 'valid';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest1', async () => {
        toValidate.attributes.stringTest1= false;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest2', async () => {
        toValidate.attributes.stringTest2= '123456';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest2 - 1', async () => {
        toValidate.attributes.stringTest2= '1234';
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - stringTest2 - 2', async () => {
        toValidate.attributes.stringTest2= '12345678901';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest3', async () => {
        toValidate.attributes.stringTest3= 'a123';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest3', async () => {
        toValidate.attributes.stringTest3= 'd123';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest4', async () => {
        toValidate.attributes.stringTest4= '2018-01-02';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest4', async () => {
        toValidate.attributes.stringTest4= 'abc';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest5', async () => {
        toValidate.attributes.stringTest5= 'a';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return true - stringTest5', async () => {
        toValidate.attributes.stringTest5= 'd';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest1 - 1', async () => {
        toValidate.attributes.arrayTest1= [1,'a'];
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - arrayTest1 - 2', async () => {
        toValidate.attributes.arrayTest1= [1,'a','additional'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest1', async () => {
        toValidate.attributes.arrayTest1= ['a',1];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest2 - 1', async () => {
        toValidate.attributes.arrayTest2= ['a',1];
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - arrayTest2 - 2', async () => {
        toValidate.attributes.arrayTest2= ['a',1,'additional'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest2 - 1', async () => {
        toValidate.attributes.arrayTest2= ['a',1,2];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest2 - 2', async () => {
        toValidate.attributes.arrayTest2= [1,2];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest3 - 1', async () => {
        toValidate.attributes.arrayTest3= ['a',1,true];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest3 - 2', async () => {
        toValidate.attributes.arrayTest3= ['a',true];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest4', async () => {
        toValidate.attributes.arrayTest4= ['a','b'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 1', async () => {
        toValidate.attributes.arrayTest4= ['a'];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 2', async () => {
        toValidate.attributes.arrayTest4= [1,2,3];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 1', async () => {
        toValidate.attributes.arrayTest4= ['a','b','c','d','e'];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest5', async () => {
        toValidate.attributes.arrayTest5= ['one','three'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return fail - arrayTest5', async () => {
        toValidate.attributes.arrayTest5= ['two','four'];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest1', async () => {
        toValidate.attributes.compoundTest1= true;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest1', async () => {
        toValidate.attributes.compoundTest1= 'invalid';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest2 - 1', async () => {
        toValidate.attributes.compoundTest2= 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - compoundTest2 - 2', async () => {
        toValidate.attributes.compoundTest2= 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest2', async () => {
        toValidate.attributes.compoundTest2= 4;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest3 - 1', async () => {
        toValidate.attributes.compoundTest3= 'valid';
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - compoundTest3 - 2', async () => {
        toValidate.attributes.compoundTest3= 123;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest3', async () => {
        toValidate.attributes.compoundTest3= false;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest4', async () => {
        toValidate.attributes.compoundTest4= 2000;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest4', async () => {
        toValidate.attributes.compoundTest4= 999;
        await executeAndVerifyFailure(toValidate);
    });

    it('missing top level required field should return false', async () => {
        delete toValidate.deviceId;
        await executeAndVerifyFailure(toValidate);
    });

    it('missing attribute required field should return false', async () => {
        delete toValidate.attributes.requiredTest;
        await executeAndVerifyFailure(toValidate);
    });

    it('an extra top level undeclared field should return false', async () => {
        toValidate.thisShouldNotBeHere= 999;
        await executeAndVerifyFailure(toValidate);
    });

    it('an extra attributes undeclared field should return false', async () => {
        toValidate.attributes.hisShouldNotBeHere= 999;
        await executeAndVerifyFailure(toValidate);
    });

    async function executeAndVerifySuccess(json:object) {

        // Make the call
        const result = await instance.validate('test', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(true);
        expect(Object.keys(result.errors).length).toEqual(0);
    }

    async function executeAndVerifyFailure(json:object) {

        // Make the call
        const result = await instance.validate('test', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);
        expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }
});
