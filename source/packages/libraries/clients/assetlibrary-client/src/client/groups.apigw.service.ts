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
import { signClientRequest } from '@awssolutions/cdf-client-request-signer';
import createError from 'http-errors';
import { injectable } from 'inversify';
import ow from 'ow';
import queryString from 'query-string';
import * as request from 'superagent';
import { QSHelper } from '../utils/qs.helper';
import { RequestHeaders } from './common.model';
import { DeviceResourceList, DeviceState } from './devices.model';
import {
    BulkLoadGroups,
    BulkLoadGroupsResponse,
    Group10Resource,
    Group20Resource,
    GroupResourceList,
} from './groups.model';
import { GroupsService, GroupsServiceBase } from './groups.service';

@injectable()
export class GroupsApigwService extends GroupsServiceBase implements GroupsService {
    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.ASSETLIBRARY_BASE_URL;
    }

    async createGroup(
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.groupsRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.headers['x-groupPath'];
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async bulkCreateGroup(
        body: BulkLoadGroups,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkLoadGroupsResponse> {
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.bulkGroupsRelativeUrl()}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .post(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async deleteGroup(groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async getGroup(
        groupPath: string,
        additionalHeaders?: RequestHeaders,
        includeGroups?: boolean
    ): Promise<Group10Resource | Group20Resource> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;
        const qs = QSHelper.getQueryString({ includeGroups });
        if (qs) {
            url += `?${qs}`;
        }
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listGroupMembersDevices(
        groupPath: string,
        template?: string,
        state?: DeviceState,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<DeviceResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupDeviceMembersRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({ template, state, offset, count });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listGroupMembersGroups(
        groupPath: string,
        template?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupGroupMembersRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({ template, offset, count });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listGroupMemberships(
        groupPath: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupMembershipsRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({ offset, count });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async updateGroup(
        groupPath: string,
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelativeUrl(groupPath)}`;
        const queryString = QSHelper.getQueryString({ applyProfile: applyProfileId });
        if (queryString) {
            url += `?${queryString}`;
        }

        return await request
            .patch(url)
            .send(body)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async attachToGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(sourceGroupPath, 'sourceGroupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupAttachedGroupRelativeUrl(
            sourceGroupPath,
            relationship,
            targetGroupPath
        )}`;
        return await request
            .put(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async detachFromGroup(
        sourceGroupPath: string,
        relationship: string,
        targetGroupPath: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(sourceGroupPath, 'sourceGroupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);
        ow(targetGroupPath, 'targetGroupPath', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupAttachedGroupRelativeUrl(
            sourceGroupPath,
            relationship,
            targetGroupPath
        )}`;

        return await request
            .delete(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((_res) => {
                return;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    async listGroupRelatedGroups(
        groupPath: string,
        relationship: string,
        template?: string,
        direction?: string,
        offset?: number,
        count?: number,
        sort?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);

        let url = `${this.baseUrl}${super.groupRelatedGroupUrl(groupPath, relationship)}`;

        let queryString = '';
        if (template != undefined && template.trim().length > 0) {
            queryString = queryString + '&template=' + template;
        }
        if (direction != undefined && direction.trim().length > 0) {
            queryString = queryString + '&direction=' + direction;
        }
        if (offset != undefined) {
            if (String(offset).trim().length > 0) {
                queryString = queryString + '&offset=' + offset;
            }
        }
        if (count != undefined) {
            if (String(count).trim().length > 0) {
                queryString = queryString + '&count=' + count;
            }
        }
        if (sort != undefined && sort.trim().length > 0) {
            queryString = queryString + '&sort=' + sort;
        }
        if (queryString) {
            queryString = queryString.slice(1);
        }

        if (queryString) {
            url += `?${queryString}`;
        }
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    /**
     * List all related devices of a specific group.
     * @param groupPath Path of group for fetching the membership
     * @param relationship The relationship between the group and groups
     * @param template Optional filter to return a specific device sub-type
     * @param direction Optional filter to return a specific direction
     * @param state Optional filter to return a specific state
     * @param offset Optional The index to start paginated results from
     * @param count Optional The maximum number of results to return
     * @param sort Optional The result returned by the specific sort
     */
    async listGroupRelatedDevices(
        groupPath: string,
        relationship: string,
        template?: string,
        direction?: string,
        state?: DeviceState,
        offset?: number,
        count?: number,
        sort?: string,
        additionalHeaders: RequestHeaders = {}
    ): Promise<DeviceResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.groupRelatedDeviceUrl(groupPath, relationship)}`;
        const urlWithParams = `${url}?${queryString.stringify({
            template,
            direction,
            state,
            offset,
            count,
            sort,
        })}`;
        return await request
            .get(urlWithParams)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }

    /**
     * Gets the group details in bulk for the given group paths. 
     * @param groupPaths List of group paths to get details for
     * @param includeGroups Optional flag to include the groups in the response. 
     * @param additionalHeaders Optional additional headers to send with the request. 
     * @returns Group details for the given group paths. 
     * @throws Error if the groupPaths is not an array. 
     * 
     */
    async bulkGetGroups(
        groupPaths: string[], 
        includeGroups?:boolean,
        additionalHeaders?:RequestHeaders, 
    ): Promise<GroupResourceList> {
        ow(groupPaths, 'groupPaths', ow.array.nonEmpty);
        let url = `${this.baseUrl}${super.bulkGroupsRelativeUrl()}`;
        const qs = QSHelper.getQueryString({includeGroups});
        let query = "";
        groupPaths.forEach(gp => {
            query += gp + ",";
        });
        query = query.substring(0, query.length - 1);
        if (qs) {
            url += `?${qs}&groupPaths=${query}`;
        } else {
            url += `?groupPaths=${query}`;
        }
        return await request
            .get(url)
            .set(this.buildHeaders(additionalHeaders))
            .use(await signClientRequest())
            .then((res) => {
                return res.body;
            })
            .catch((err) => {
                throw createError(err.response.status, err.response.text);
            });
    }
}
