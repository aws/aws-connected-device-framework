/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/* tslint:disable:no-unused-variable member-ordering */

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { GroupsServiceBase, GroupsService } from './groups.service';
import { GroupList, Group } from './groups.model';

@injectable()
export class GroupsApigwService extends GroupsServiceBase implements GroupsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('greengrassProvisioning.baseUrl') as string;
    }

    async createGroups(groups:Group[], additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(groups, ow.object.nonEmpty);
        const url = `${this.baseUrl}${super.groupsRelativeUrl()}`;
        const res = await request.post(url)
            .send({groups})
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }

    async getGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<Group> {
        ow(groupName, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelativeUrl(groupName)}`;
        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));

        return res.body;
    }
}
