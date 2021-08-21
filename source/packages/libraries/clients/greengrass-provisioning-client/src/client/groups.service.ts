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
import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { Group, GroupList } from './groups.model';

export interface GroupsService {

    createGroups(groups:Group[], additionalHeaders?:RequestHeaders) : Promise<GroupList>;

    getGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<Group>;

    deleteGroupByName(name:string, additionalHeaders?:RequestHeaders) : Promise<void>;

    listByTemplate(templateName:string, additionalHeaders?:RequestHeaders): Promise<GroupList>;

    listByTemplateVersion(templateName:string, versionNo:number, additionalHeaders?:RequestHeaders): Promise<GroupList>;

}

@injectable()
export class GroupsServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected groupsRelativeUrl() : string {
        return '/groups';
    }

    protected groupRelativeUrl(groupName:string) : string {
        return PathHelper.encodeUrl('groups', groupName);
    }

    protected groupsByTemplateRelativeUrl(templateName:string) : string {
        return PathHelper.encodeUrl('templates', templateName, 'groups');
    }

    protected groupsByTemplateVersionRelativeUrl(templateName:string, versionNo:number) : string {
        return PathHelper.encodeUrl('templates', templateName, 'versions', String(versionNo), 'groups');
    }
}
