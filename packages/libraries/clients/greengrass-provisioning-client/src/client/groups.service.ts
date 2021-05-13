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
