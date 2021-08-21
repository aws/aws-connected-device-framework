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
import {SearchRequestFilterDirection, SearchRequestModel} from './search.model';

describe('SearchRequestModel', () => {

    it('should create a search request Model', () => {
        const searchRequestModel = new SearchRequestModel();
        searchRequestModel.types = ['device'];
        searchRequestModel.eq = [{
            traversals: [{
                relation: 'installed_in',
                direction: SearchRequestFilterDirection.out
            },{
                relation: 'belongs_to',
                direction: SearchRequestFilterDirection.out
            }],
            field: 'name',
            value: 'customer001'
        },{
            traversals: [{
                relation: 'located_at',
                direction: SearchRequestFilterDirection.out
            }],
            field: 'name',
            value: 'colorado'
        },{
            field: 'name',
            value: '5AZVZ34HXGA10004'
        }];

        const httpQueryString = searchRequestModel.toHttpQueryString();
        const lambdaQueryString = searchRequestModel.toLambdaMultiValueQueryString();

        expect(httpQueryString).toBeDefined();
        expect(httpQueryString).toEqual('type=device&eq=installed_in%3Aout%3Abelongs_to%3Aout%3Aname%3Acustomer001&eq=located_at%3Aout%3Aname%3Acolorado&eq=name%3A5AZVZ34HXGA10004');

        expect(lambdaQueryString).toBeDefined();
        expect(lambdaQueryString.type).toHaveLength(1);
        expect(lambdaQueryString.type[0]).toEqual('device');
        expect(lambdaQueryString.eq).toHaveLength(3);
        expect(lambdaQueryString.eq[0]).toEqual('installed_in:out:belongs_to:out:name:customer001');
        expect(lambdaQueryString.eq[1]).toEqual('located_at:out:name:colorado');
        expect(lambdaQueryString.eq[2]).toEqual('name:5AZVZ34HXGA10004');

        expect(decodeURIComponent(httpQueryString)).toEqual('type=device&eq=installed_in:out:belongs_to:out:name:customer001&eq=located_at:out:name:colorado&eq=name:5AZVZ34HXGA10004');
    });

    it('should create a search request Model and encode special characters properly', () => {
        const searchRequestModel = new SearchRequestModel();
        searchRequestModel.types = ['auto_ecu'];
        searchRequestModel.eq = [{
            field: 'name',
            value: 'ap-northeast-1:55f70ca4-faaa-4aa0-8778-99a102174740'
        }];

        const httpQueryString = searchRequestModel.toHttpQueryString();
        const lambdaQueryString = searchRequestModel.toLambdaMultiValueQueryString();

        expect(httpQueryString).toBeDefined();
        expect(httpQueryString).toEqual('type=auto_ecu&eq=name%3Aap-northeast-1%253A55f70ca4-faaa-4aa0-8778-99a102174740');

        expect(lambdaQueryString).toBeDefined();
        expect(lambdaQueryString.type).toHaveLength(1);
        expect(lambdaQueryString.type[0]).toEqual('auto_ecu');
        expect(lambdaQueryString.eq).toHaveLength(1);
        expect(lambdaQueryString.eq[0]).toEqual('name:ap-northeast-1%3A55f70ca4-faaa-4aa0-8778-99a102174740');

        expect(decodeURIComponent(httpQueryString)).toEqual('type=auto_ecu&eq=name:ap-northeast-1%3A55f70ca4-faaa-4aa0-8778-99a102174740');

    });
});
