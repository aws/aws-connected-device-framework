/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { SearchRequestModel, FacetResults} from './search.models';
import { GroupItem } from '../groups/groups.models';
import { DeviceItem } from '../devices/devices.models';

export interface SearchService {

    search(model: SearchRequestModel, offset?:number|string, count?:number): Promise<[(GroupItem|DeviceItem)[],number|string,number]> ;

    facet(request: SearchRequestModel): Promise<FacetResults>;

    summary(model: SearchRequestModel): Promise<number> ;
}
