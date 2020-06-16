/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
/**
 * Connected Device Framework: Dashboard Facade
 * AssetLibrary Implementation of GroupsService *
*/

import {inject, injectable} from 'inversify';
import {
    BulkLoadGroups,
    BulkLoadGroupsResponse,
    Group10Resource,
    Group20Resource,
    GroupResourceList,
} from './groups.model';
import {DeviceResourceList, DeviceState} from './devices.model';
import ow from 'ow';
import {GroupsService, GroupsServiceBase} from './groups.service';
import {RequestHeaders} from './common.model';
import {LambdaApiGatewayEventBuilder, LAMBDAINVOKE_TYPES, LambdaInvokerService} from '@cdf/lambda-invoke';

@injectable()
export class GroupsLambdaService extends GroupsServiceBase implements GroupsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('assetLibrary.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    /**
     * Adds a new group to the device library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    async createGroup(body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(body, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath(super.groupsRelativeUrl())
            .setQueryStringParameters({
                applyProfile: applyProfileId
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Adds a batch of new group to the asset library as a child of the &#x60;parentPath&#x60; as specified in the request body.
     *
     * @param body Group to add to the asset library
     */
    async bulkCreateGroup(body: BulkLoadGroups, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<BulkLoadGroupsResponse> {
        ow(body, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath(super.bulkGroupsRelativeUrl())
            .setQueryStringParameters({
                applyProfile: applyProfileId
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * Delete group with supplied path
     * Deletes a single group
     * @param groupPath Path of group to return
     */
    async deleteGroup(groupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(groupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('DELETE')
            .setPath(super.groupRelativeUrl(groupPath))
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    /**
     * Find group by Group&#39;s path
     * Returns a single group
     * @param groupPath Path of group to return
     */
    async getGroup(groupPath: string, additionalHeaders?:RequestHeaders): Promise<Group10Resource | Group20Resource> {
        ow(groupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupRelativeUrl(groupPath))
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * List device members of group for supplied Group name
     * Returns device members of group
     * @param groupPath Path of group to return its device members. A path of &#39;/&#39; can be passed as id to return top level device members
     * @param template Optional filter to return a specific device sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMembersDevices(groupPath: string, template?: string, state?: DeviceState, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<DeviceResourceList> {
        ow(groupPath, ow.string.nonEmpty);

       const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupDeviceMembersRelativeUrl(groupPath))
            .setQueryStringParameters({
                template,
                state,
                offset: `${offset}`,
                count: `${count}`
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * List group members of group for supplied Group name
     * Returns group members of group
     * @param groupPath Path of group to return its group members. A path of &#39;/&#39; can be passed as id to return top level group members
     * @param template Optional filter to return a specific group sub-type
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMembersGroups(groupPath: string, template?: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList> {
        ow(groupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupGroupMembersRelativeUrl(groupPath))
            .setQueryStringParameters({
                template,
                offset: `${offset}`,
                count: `${count}`
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * List all ancestor groups of a specific group.
     * List all ancestor groups of a specific group.s
     * @param groupPath Path of group for fetching the membership
     * @param offset The index to start paginated results from
     * @param count The maximum number of results to return
     */
    async listGroupMemberships(groupPath: string, offset?: number, count?: number, additionalHeaders?:RequestHeaders): Promise<GroupResourceList> {
        ow(groupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupMembershipsRelativeUrl(groupPath))
            .setQueryStringParameters({
                offset: `${offset}`,
                count: `${count}`
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    /**
     * Update an existing group attributes, including changing its parent group.
     *
     * @param groupPath Path of group to return
     * @param body Group object that needs to be updated
     */
    async updateGroup(groupPath: string, body: Group10Resource | Group20Resource, applyProfileId?: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(groupPath, ow.string.nonEmpty);
        ow(body, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('PATCH')
            .setPath(super.groupRelativeUrl(groupPath))
            .setQueryStringParameters({
                applyProfile: applyProfileId
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async attachToGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('PUT')
            .setPath(super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath))
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async detachFromGroup(sourceGroupPath: string, relationship: string, targetGroupPath: string, additionalHeaders?:RequestHeaders): Promise<void> {
        ow(sourceGroupPath, ow.string.nonEmpty);
        ow(relationship, ow.string.nonEmpty);
        ow(targetGroupPath, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('DELETE')
            .setPath(super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath))
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}
