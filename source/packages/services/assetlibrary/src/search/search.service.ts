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
import { DeviceItem } from '../devices/devices.models';
import { GroupItem } from '../groups/groups.models';
import { FacetResults, SearchRequestModel } from './search.models';

export interface SearchService {
    search(
        model: SearchRequestModel
    ): Promise<[(GroupItem | DeviceItem)[], number | string, number]>;

    delete(model: SearchRequestModel): Promise<void>;

    facet(request: SearchRequestModel): Promise<FacetResults>;

    summary(model: SearchRequestModel): Promise<number>;
}
