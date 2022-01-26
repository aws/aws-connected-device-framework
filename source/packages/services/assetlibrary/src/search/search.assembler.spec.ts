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
        startsWiths: string|string[]|undefined;
        endsWiths: string|string[]|undefined;
        containses: string|string[]|undefined;
        fulltexts: string|string[]|undefined;
        regexes: string|string[]|undefined;
        lucenes: string|string[]|undefined;
        facetField: string|undefined;
    };
    beforeEach(() => {
        mockedDeviceAssembler = createMockInstance(DevicesAssembler);
        mockedGroupAssembler = createMockInstance(GroupsAssembler);
        instance = new SearchAssembler(mockedDeviceAssembler, mockedGroupAssembler);
    });

    it('happy path to convert one search param to a search request model', async () => {

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
            endsWiths: undefined,
            containses: undefined,
            fulltexts: undefined,
            regexes: undefined,
            lucenes: undefined,
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
                mockedSearchRequest.endsWiths,
                mockedSearchRequest.containses,
                mockedSearchRequest.fulltexts,
                mockedSearchRequest.regexes,
                mockedSearchRequest.lucenes,
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

    it('happy path to convert all search params to search request model', async () => {

        mockedSearchRequest = {
            types: 'auto_ecu',
            ancestorPath: '/vehicle/engine/electronics',
            eqs: 'eqfield:eqval',
            neqs: 'neqfield:neqval',
            lts: 'ltfield:1',
            ltes: 'ltefield:2000',
            gts: 'gtfield:3.1416',
            gtes: 'gtefield:4',
            startsWiths: 'swfield:abc',
            endsWiths: 'ewfield:xyz',
            containses: 'confield:opq',
            fulltexts: 'ftfield:*abc*',
            regexes: 'refield:AB[CD]12++',
            lucenes: undefined,
            exists: 'exfield:exval',
            nexists: 'nexfield:nexval',
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
                mockedSearchRequest.endsWiths,
                mockedSearchRequest.containses,
                mockedSearchRequest.fulltexts,
                mockedSearchRequest.regexes,
                mockedSearchRequest.lucenes,
                mockedSearchRequest.exists,
                mockedSearchRequest.nexists,
                mockedSearchRequest.facetField
            );

        expect(searchRequestModel).toBeDefined();
        expect(searchRequestModel.types).toHaveLength(1);
        expect(searchRequestModel.types[0]).toEqual('auto_ecu');
        expect(searchRequestModel.eq).toHaveLength(1);
        expect(searchRequestModel.eq[0].field).toEqual('eqfield');
        expect(searchRequestModel.eq[0].value).toEqual('eqval');
        expect(searchRequestModel.neq).toHaveLength(1);
        expect(searchRequestModel.neq[0].field).toEqual('neqfield');
        expect(searchRequestModel.neq[0].value).toEqual('neqval');
        expect(searchRequestModel.lt).toHaveLength(1);
        expect(searchRequestModel.lt[0].field).toEqual('ltfield');
        expect(searchRequestModel.lt[0].value).toEqual('1');
        expect(searchRequestModel.lte).toHaveLength(1);
        expect(searchRequestModel.lte[0].field).toEqual('ltefield');
        expect(searchRequestModel.lte[0].value).toEqual('2000');
        expect(searchRequestModel.gt).toHaveLength(1);
        expect(searchRequestModel.gt[0].field).toEqual('gtfield');
        expect(searchRequestModel.gt[0].value).toEqual('3.1416');
        expect(searchRequestModel.gte).toHaveLength(1);
        expect(searchRequestModel.gte[0].field).toEqual('gtefield');
        expect(searchRequestModel.gte[0].value).toEqual('4');
        expect(searchRequestModel.startsWith).toHaveLength(1);
        expect(searchRequestModel.startsWith[0].field).toEqual('swfield');
        expect(searchRequestModel.startsWith[0].value).toEqual('abc');
        expect(searchRequestModel.endsWith).toHaveLength(1);
        expect(searchRequestModel.endsWith[0].field).toEqual('ewfield');
        expect(searchRequestModel.endsWith[0].value).toEqual('xyz');
        expect(searchRequestModel.contains).toHaveLength(1);
        expect(searchRequestModel.contains[0].field).toEqual('confield');
        expect(searchRequestModel.contains[0].value).toEqual('opq');
        expect(searchRequestModel.fulltext).toHaveLength(1);
        expect(searchRequestModel.fulltext[0].field).toEqual('ftfield');
        expect(searchRequestModel.fulltext[0].value).toEqual('*abc*');
        expect(searchRequestModel.regex).toHaveLength(1);
        expect(searchRequestModel.regex[0].field).toEqual('refield');
        expect(searchRequestModel.regex[0].value).toEqual('AB[CD]12++');
        expect(searchRequestModel.exists).toHaveLength(1);
        expect(searchRequestModel.exists[0].field).toEqual('exfield');
        expect(searchRequestModel.exists[0].value).toEqual('exval');
        expect(searchRequestModel.nexists).toHaveLength(1);
        expect(searchRequestModel.nexists[0].field).toEqual('nexfield');
        expect(searchRequestModel.nexists[0].value).toEqual('nexval');
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
            endsWiths: undefined,
            containses: undefined,
            fulltexts: undefined,
            regexes: undefined,
            lucenes: undefined,
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
            mockedSearchRequest.endsWiths,
            mockedSearchRequest.containses,
            mockedSearchRequest.fulltexts,
            mockedSearchRequest.regexes,
            mockedSearchRequest.lucenes,
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
            endsWiths: undefined,
            containses: undefined,
            fulltexts: undefined,
            regexes: undefined,
            lucenes: undefined,
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
            mockedSearchRequest.endsWiths,
            mockedSearchRequest.containses,
            mockedSearchRequest.fulltexts,
            mockedSearchRequest.regexes,
            mockedSearchRequest.lucenes,
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
