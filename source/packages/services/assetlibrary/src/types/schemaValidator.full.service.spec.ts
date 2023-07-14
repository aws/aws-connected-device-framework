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
import * as fs from 'fs';
import * as path from 'path';
import 'reflect-metadata';

import createMockInstance from 'jest-create-mock-instance';
import { DirectionToRelatedEntityArrayMap, EntityTypeMap } from '../data/model';
import { DevicesDaoFull } from '../devices/devices.full.dao';
import { GroupsDaoFull } from '../groups/groups.full.dao';
import { Operation, TypeCategory } from './constants';
import { SchemaValidatorService } from './schemaValidator.full.service';
import { TypesDaoFull } from './types.full.dao';
import { TypeModel, TypeRelationsModel } from './types.models';

describe('SchemaValidatorService', () => {
    let mockedDevicesDaoFull: jest.Mocked<DevicesDaoFull>;
    let mockedGroupsDaoFull: jest.Mocked<GroupsDaoFull>;
    let mockedTypesDao: jest.Mocked<TypesDaoFull>;
    let instance: SchemaValidatorService;
    let superTypeSchema: any;
    let specializedTypeSchema: any;
    let toValidate: any;

    beforeEach(() => {
        mockedTypesDao = createMockInstance(TypesDaoFull);
        mockedDevicesDaoFull = createMockInstance(DevicesDaoFull);
        mockedGroupsDaoFull = createMockInstance(GroupsDaoFull);
        instance = new SchemaValidatorService(
            mockedTypesDao,
            mockedDevicesDaoFull,
            mockedGroupsDaoFull
        );
        superTypeSchema = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, '../../src/types/definitions/device.schema.json'),
                { encoding: 'utf8' }
            )
        );
        specializedTypeSchema = JSON.parse(
            fs.readFileSync(
                path.join(__dirname, '../../src/utils/testResources/test.schema.json'),
                { encoding: 'utf8' }
            )
        );
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
                requiredTest: 'abc',
            },
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
        toValidate.attributes.integerTest2 = 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 1', async () => {
        toValidate.attributes.integerTest2 = 3;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 2', async () => {
        toValidate.attributes.integerTest2 = 55;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest2 - 3', async () => {
        toValidate.attributes.integerTest2 = 43;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - integerTest3 - 1', async () => {
        toValidate.attributes.integerTest3 = 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest3 - 1', async () => {
        toValidate.attributes.integerTest3 = 5;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - integerTest3 - 2', async () => {
        toValidate.attributes.integerTest3 = 50;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - integerTest4', async () => {
        toValidate.attributes.integerTest4 = 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - integerTest4', async () => {
        toValidate.attributes.integerTest4 = 2;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest1', async () => {
        toValidate.attributes.numberTest1 = 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest1', async () => {
        toValidate.attributes.numberTest1 = 'invalid';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest2', async () => {
        toValidate.attributes.numberTest2 = 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 1', async () => {
        toValidate.attributes.numberTest2 = 3;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 2', async () => {
        toValidate.attributes.numberTest2 = 55;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest2 - 3', async () => {
        toValidate.attributes.numberTest2 = 43;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest3 - 1', async () => {
        toValidate.attributes.numberTest3 = 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest3 - 1', async () => {
        toValidate.attributes.numberTest3 = 5;
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - numberTest3 - 2', async () => {
        toValidate.attributes.numberTest3 = 50;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - numberTest4', async () => {
        toValidate.attributes.numberTest4 = 1;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - numberTest4', async () => {
        toValidate.attributes.numberTest4 = 2;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest1', async () => {
        toValidate.attributes.stringTest1 = 'valid';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest1', async () => {
        toValidate.attributes.stringTest1 = false;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest2', async () => {
        toValidate.attributes.stringTest2 = '123456';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest2 - 1', async () => {
        toValidate.attributes.stringTest2 = '1234';
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - stringTest2 - 2', async () => {
        toValidate.attributes.stringTest2 = '12345678901';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest3', async () => {
        toValidate.attributes.stringTest3 = 'a123';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest3', async () => {
        toValidate.attributes.stringTest3 = 'd123';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest4', async () => {
        toValidate.attributes.stringTest4 = '2018-01-02';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - stringTest4', async () => {
        toValidate.attributes.stringTest4 = 'abc';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - stringTest5', async () => {
        toValidate.attributes.stringTest5 = 'a';
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return true - stringTest5', async () => {
        toValidate.attributes.stringTest5 = 'd';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest1 - 1', async () => {
        toValidate.attributes.arrayTest1 = [1, 'a'];
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - arrayTest1 - 2', async () => {
        toValidate.attributes.arrayTest1 = [1, 'a', 'additional'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest1', async () => {
        toValidate.attributes.arrayTest1 = ['a', 1];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest2 - 1', async () => {
        toValidate.attributes.arrayTest2 = ['a', 1];
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - arrayTest2 - 2', async () => {
        toValidate.attributes.arrayTest2 = ['a', 1, 'additional'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest2 - 1', async () => {
        toValidate.attributes.arrayTest2 = ['a', 1, 2];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest2 - 2', async () => {
        toValidate.attributes.arrayTest2 = [1, 2];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest3 - 1', async () => {
        toValidate.attributes.arrayTest3 = ['a', 1, true];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest3 - 2', async () => {
        toValidate.attributes.arrayTest3 = ['a', true];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest4', async () => {
        toValidate.attributes.arrayTest4 = ['a', 'b'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 1', async () => {
        toValidate.attributes.arrayTest4 = ['a'];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 2', async () => {
        toValidate.attributes.arrayTest4 = [1, 2, 3];
        await executeAndVerifyFailure(toValidate);
    });

    it('invalid json against schema should return false - arrayTest4 - 1', async () => {
        toValidate.attributes.arrayTest4 = ['a', 'b', 'c', 'd', 'e'];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - arrayTest5', async () => {
        toValidate.attributes.arrayTest5 = ['one', 'three'];
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return fail - arrayTest5', async () => {
        toValidate.attributes.arrayTest5 = ['two', 'four'];
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest1', async () => {
        toValidate.attributes.compoundTest1 = true;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest1', async () => {
        toValidate.attributes.compoundTest1 = 'invalid';
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest2 - 1', async () => {
        toValidate.attributes.compoundTest2 = 6;
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - compoundTest2 - 2', async () => {
        toValidate.attributes.compoundTest2 = 10;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest2', async () => {
        toValidate.attributes.compoundTest2 = 4;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest3 - 1', async () => {
        toValidate.attributes.compoundTest3 = 'valid';
        await executeAndVerifySuccess(toValidate);
    });

    it('valid json against schema should return true - compoundTest3 - 2', async () => {
        toValidate.attributes.compoundTest3 = 123;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest3', async () => {
        toValidate.attributes.compoundTest3 = false;
        await executeAndVerifyFailure(toValidate);
    });

    it('valid json against schema should return true - compoundTest4', async () => {
        toValidate.attributes.compoundTest4 = 2000;
        await executeAndVerifySuccess(toValidate);
    });

    it('invalid json against schema should return false - compoundTest4', async () => {
        toValidate.attributes.compoundTest4 = 999;
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
        toValidate.thisShouldNotBeHere = 999;
        await executeAndVerifyFailure(toValidate);
    });

    it('an extra attributes undeclared field should return false', async () => {
        toValidate.attributes.hisShouldNotBeHere = 999;
        await executeAndVerifyFailure(toValidate);
    });

    async function executeAndVerifySuccess(json: object) {
        // Make the call
        const result = await instance.validate('test', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(true);
        expect(Object.keys(result.errors).length).toEqual(0);
    }

    async function executeAndVerifyFailure(json: object) {
        // Make the call
        const result = await instance.validate('test', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);
        expect(Object.keys(result.errors).length).toBeGreaterThan(0);
    }

    it('validateRelationshipsByIds - happy path', async () => {
        // mocks
        const mockedDeviceLabels: EntityTypeMap = {
            device1: ['device', 'template2'],
            device2: ['device', 'template3'],
        };
        mockedDevicesDaoFull.getLabels = jest.fn().mockResolvedValueOnce(mockedDeviceLabels);

        const mockedGroupLabels: EntityTypeMap = {
            '/group/1': ['group', 'template4'],
            '/group/2': ['group', 'template5'],
        };
        mockedGroupsDaoFull.getLabels = jest.fn().mockResolvedValueOnce(mockedGroupLabels);

        // test
        const typeRelationsModel = new TypeRelationsModel();
        typeRelationsModel.in = {
            rel1: ['template2', 'template4'],
        };
        typeRelationsModel.out = {
            rel2: ['template3'],
            rel3: ['template5'],
        };
        const template: TypeModel = {
            templateId: 'template1',
            category: TypeCategory.Device,
            schema: {
                definition: {},
                relations: typeRelationsModel,
            },
        };
        const groups: DirectionToRelatedEntityArrayMap = {
            in: {
                rel1: [{ id: '/group/1' }],
            },
            out: {
                rel3: [{ id: '/group/2' }],
            },
        };
        const devices: DirectionToRelatedEntityArrayMap = {
            in: {
                rel1: [{ id: 'device1' }],
            },
            out: {
                rel2: [{ id: 'device2' }],
            },
        };
        const actual = await instance.validateRelationshipsByIds(template, groups, devices);

        // verify
        expect(actual).toBeDefined;
        expect(actual.isValid).toEqual(true);
        expect(actual.deviceLabels).toEqual(mockedDeviceLabels);
        expect(actual.groupLabels).toEqual(mockedGroupLabels);
        expect(mockedDevicesDaoFull.getLabels).toBeCalledTimes(1);
        expect(mockedDevicesDaoFull.getLabels).toBeCalledWith(['device1', 'device2']);
        expect(mockedGroupsDaoFull.getLabels).toBeCalledTimes(1);
        expect(mockedGroupsDaoFull.getLabels).toBeCalledWith(['/group/1', '/group/2']);
    });
});
