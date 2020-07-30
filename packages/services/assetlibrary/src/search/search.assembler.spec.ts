/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { SearchAssembler } from './search.assembler';
import { DevicesAssembler } from '../devices/devices.assembler';
import { GroupsAssembler } from '../groups/groups.assembler';

describe('SearchServiceAssembler', () => {

    let instance: SearchAssembler;
    let mockedDeviceAssembler: jest.Mocked<DevicesAssembler>;
    let mockedGroupAssembler: jest.Mocked<GroupsAssembler>;

    let mockedSearchRequest: {
        types: string|string[]|undefined;
        ancestorPath: string|undefined;
        ltes: string|string[]|undefined;
        eqs: string|string[]|undefined;
        gts: string|string[]|undefined;
        exists: string|string[]|undefined;
        nexists: string|string[]|undefined;
        neqs: string|string[]|undefined;
        lts: string|string[]|undefined;
        gtes: string|string[]|undefined;
        facetField: string|undefined;
        startsWiths: string|string[]|undefined
    };
    beforeEach(() => {
        mockedDeviceAssembler = createMockInstance(DevicesAssembler);
        mockedGroupAssembler = createMockInstance(GroupsAssembler);
        instance = new SearchAssembler(mockedDeviceAssembler, mockedGroupAssembler);
    });

    it('happy path to convert the search params to search request model', async () => {

        mockedSearchRequest = {
            types: 'auto_ecu',
            ancestorPath: undefined,
            eqs: 'installed_in:out:name:5AZVZ34HXGA10004',
            neqs: undefined,
            lts: undefined,
            ltes: undefined,
            gts: undefined,
            gtes: undefined,
            startsWiths: undefined,
            exists: undefined,
            nexists: undefined,
            facetField: undefined
        };

        const searchRequestModel = await instance.toSearchRequestModel(
                mockedSearchRequest.types,
                mockedSearchRequest.ancestorPath,
                mockedSearchRequest.eqs,
                mockedSearchRequest.neqs,
                mockedSearchRequest.lts,
                mockedSearchRequest.ltes,
                mockedSearchRequest.gts,
                mockedSearchRequest.gtes,
                mockedSearchRequest.startsWiths,
                mockedSearchRequest.exists,
                mockedSearchRequest.nexists,
                mockedSearchRequest.facetField
            );

        expect(searchRequestModel).toBeDefined();
        expect(searchRequestModel.types).toHaveLength(1);
        expect(searchRequestModel.types[0]).toEqual('auto_ecu');
        expect(searchRequestModel.eq).toHaveLength(1);
        expect(searchRequestModel.eq[0].traversals).toHaveLength(1);
        expect(searchRequestModel.eq[0].traversals[0].relation).toEqual('installed_in');
        expect(searchRequestModel.eq[0].traversals[0].direction).toEqual('out');
        expect(searchRequestModel.eq[0].field).toEqual('name');
        expect(searchRequestModel.eq[0].value).toEqual('5AZVZ34HXGA10004');

    });

    it('should decode the encoded params to search request model', async () => {

        mockedSearchRequest = {
            types: 'auto_ecu',
            ancestorPath: undefined,
            eqs: 'driver:out:name:ap-northeast-1%3A55f70ca4-faaa-4aa0-8778-99a102174740',
            neqs: undefined,
            lts: undefined,
            ltes: undefined,
            gts: undefined,
            gtes: undefined,
            startsWiths: undefined,
            exists: undefined,
            nexists: undefined,
            facetField: undefined
        };

        const searchRequestModel = await instance.toSearchRequestModel(
            mockedSearchRequest.types,
            mockedSearchRequest.ancestorPath,
            mockedSearchRequest.eqs,
            mockedSearchRequest.neqs,
            mockedSearchRequest.lts,
            mockedSearchRequest.ltes,
            mockedSearchRequest.gts,
            mockedSearchRequest.gtes,
            mockedSearchRequest.startsWiths,
            mockedSearchRequest.exists,
            mockedSearchRequest.nexists,
            mockedSearchRequest.facetField
        );

        expect(searchRequestModel).toBeDefined();
        expect(searchRequestModel.types).toHaveLength(1);
        expect(searchRequestModel.types[0]).toEqual('auto_ecu');
        expect(searchRequestModel.eq).toHaveLength(1);
        expect(searchRequestModel.eq[0].traversals).toHaveLength(1);
        expect(searchRequestModel.eq[0].traversals[0].relation).toEqual('driver');
        expect(searchRequestModel.eq[0].traversals[0].direction).toEqual('out');
        expect(searchRequestModel.eq[0].field).toEqual('name');
        expect(searchRequestModel.eq[0].value).toEqual('ap-northeast-1:55f70ca4-faaa-4aa0-8778-99a102174740');
    });

    it('should decode the encoded params to search request model', async () => {

        mockedSearchRequest = {
            types: 'user',
            ancestorPath: undefined,
            eqs: 'name:ap-northeast-1%3A55f70ca4-faaa-4aa0-8778-99a102174740',
            neqs: undefined,
            lts: undefined,
            ltes: undefined,
            gts: undefined,
            gtes: undefined,
            startsWiths: undefined,
            exists: undefined,
            nexists: undefined,
            facetField: undefined
        };

        const searchRequestModel = await instance.toSearchRequestModel(
            mockedSearchRequest.types,
            mockedSearchRequest.ancestorPath,
            mockedSearchRequest.eqs,
            mockedSearchRequest.neqs,
            mockedSearchRequest.lts,
            mockedSearchRequest.ltes,
            mockedSearchRequest.gts,
            mockedSearchRequest.gtes,
            mockedSearchRequest.startsWiths,
            mockedSearchRequest.exists,
            mockedSearchRequest.nexists,
            mockedSearchRequest.facetField
        );

        expect(searchRequestModel).toBeDefined();
        expect(searchRequestModel.types).toHaveLength(1);
        expect(searchRequestModel.types[0]).toEqual('user');
        expect(searchRequestModel.eq).toHaveLength(1);
        expect(searchRequestModel.eq[0].field).toEqual('name');
        expect(searchRequestModel.eq[0].value).toEqual('ap-northeast-1:55f70ca4-faaa-4aa0-8778-99a102174740');
    });
});
