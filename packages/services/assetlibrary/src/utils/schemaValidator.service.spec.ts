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

    beforeEach(() => {
        instance = new SchemaValidatorService();
        superTypeSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/types/definitions/device.schema.json'), {encoding: 'utf8'}));
        specializedTypeSchema = JSON.parse(fs.readFileSync(path.join(__dirname, '../../src/utils/testResources/mote.schema.json'), {encoding: 'utf8'}));
        superTypeSchema.definitions.subType.properties = specializedTypeSchema.properties;
        superTypeSchema.definitions.subType.required = specializedTypeSchema.required;
        // no components...
        delete superTypeSchema.properties.components;
        delete superTypeSchema.definitions.componentTypes;

    });

    it('valid json against schema should return true', async () => {

        const json = {
            'deviceId': 'device-001',
            'templateId': 'mote',
            'attributes': {
                'length': 1,
                'width': 2,
                'height': 3
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(true);
        expect(Object.keys(result.errors).length).toEqual(0);

    });

    it('missing top level required field should return false', async () => {

        const json = {
            'templateId': 'mote',
            'attributes': {
                'length': 1,
                'width': 2,
                'height': 3
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);
        expect(Object.keys(result.errors).length).toBeGreaterThan(0);

    });

    it('missing attribute required field should return false', async () => {

        const json = {
            'deviceId': 'device-001',
            'templateId': 'mote',
            'attributes': {
                'length': 1,
                'width': 2
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);

    });

    it('incorrect attribute type should return false', async () => {

        const json = {
            'deviceId': 'device-001',
            'templateId': 'mote',
            'attributes': {
                'length': '1',
                'width': 2,
                'height': 3
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);

    });

    it('an extra top level undeclared field should return false', async () => {

        const json = {
            'deviceId': 'device-001',
            'templateId': 'mote',
            'this-should-not-be-here': true,
            'attributes': {
                'length': 1,
                'width': 2,
                'height': 3
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);

    });

    it('an extra attributes undeclared field should return false', async () => {
        const json = {
            'deviceId': 'device-001',
            'templateId': 'mote',
            'attributes': {
                'length': 1,
                'width': 2,
                'height': 3,
                'this-should-not-be-here': true
            }
        };

        // Make the call
        const result = await instance.validate('mote', superTypeSchema, json, Operation.CREATE);

        // Finally, verify the results
        expect(result).toBeDefined();
        expect(result.isValid).toEqual(false);

    });
});
