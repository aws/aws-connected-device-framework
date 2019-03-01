/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { SearchRequestModel} from './search.models';
import { GroupModel } from '../groups/groups.models';
import { DeviceModel } from '../devices/devices.models';

export interface SearchService {

    search(model: SearchRequestModel, offset?:number|string, count?:number): Promise<(GroupModel|DeviceModel)[]> ;

    summary(model: SearchRequestModel): Promise<number> ;
}
