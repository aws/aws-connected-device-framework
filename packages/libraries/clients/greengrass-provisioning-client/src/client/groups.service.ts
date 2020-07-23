import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { Group, GroupList } from './groups.model';

export interface GroupsService {

    createGroups(groups:Group[], additionalHeaders?:RequestHeaders) : Promise<GroupList>;

    getGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<Group>;

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
}
