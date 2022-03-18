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
// import { ContainerModule, decorate, injectable, interfaces } from 'inversify';
import { ContainerModule, interfaces } from 'inversify';
import { SearchDaoEnhanced } from '../search/search.enhanced.dao';
import { TYPES } from './types';



export const EnhancedContainerModule = new ContainerModule (
    (
        bind: interfaces.Bind,
        _unbind: interfaces.Unbind,
        _isBound: interfaces.IsBound,
        rebind: interfaces.Rebind
    ) => {
        bind<string>('openSearchEndpoint').toConstantValue(process.env.OPENSEARCH_ENDPOINT);
        rebind<SearchDaoEnhanced>(TYPES.SearchDao).to(SearchDaoEnhanced).inSingletonScope();
    }
);
