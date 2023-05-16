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
import {
    Dictionary,
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@aws-solutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
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
export class GroupsLambdaService extends GroupsServiceBase implements GroupsService {
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ASSETLIBRARY_API_FUNCTION_NAME;
    }

    async createGroup(
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<string> {
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath(super.groupsRelativeUrl())
            .setQueryStringParameters({
                applyProfile: applyProfileId,
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const req = await this.lambdaInvoker.invoke(this.functionName, event);
        return req.header['x-groupPath'];
    }

    async bulkCreateGroup(
        body: BulkLoadGroups,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkLoadGroupsResponse> {
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('POST')
            .setPath(super.bulkGroupsRelativeUrl())
            .setQueryStringParameters({
                applyProfile: applyProfileId,
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteGroup(groupPath: string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('DELETE')
            .setPath(super.groupRelativeUrl(groupPath))
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async getGroup(
        groupPath: string,
        additionalHeaders?: RequestHeaders,
        includeGroups?: boolean
    ): Promise<Group10Resource | Group20Resource> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupRelativeUrl(groupPath))
            .setQueryStringParameters({ includeGroups: `${includeGroups}` })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
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

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupDeviceMembersRelativeUrl(groupPath))
            .setQueryStringParameters({
                template,
                state,
                offset: `${offset}`,
                count: `${count}`,
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listGroupMembersGroups(
        groupPath: string,
        template?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupGroupMembersRelativeUrl(groupPath))
            .setQueryStringParameters({
                template,
                offset: `${offset}`,
                count: `${count}`,
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listGroupMemberships(
        groupPath: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders
    ): Promise<GroupResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupMembershipsRelativeUrl(groupPath))
            .setQueryStringParameters({
                offset: `${offset}`,
                count: `${count}`,
            })
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async updateGroup(
        groupPath: string,
        body: Group10Resource | Group20Resource,
        applyProfileId?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(body, 'body', ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('PATCH')
            .setPath(super.groupRelativeUrl(groupPath))
            .setQueryStringParameters({
                applyProfile: applyProfileId,
            })
            .setBody(body)
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('PUT')
            .setPath(
                super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath)
            )
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
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

        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('DELETE')
            .setPath(
                super.groupAttachedGroupRelativeUrl(sourceGroupPath, relationship, targetGroupPath)
            )
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
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

        const myqs: Dictionary = {};
        if (template != undefined && template.trim().length > 0) {
            myqs.template = `${template}`;
        }
        if (direction != undefined && direction.trim().length > 0) {
            myqs.direction = `${direction}`;
        }
        if (offset != undefined) {
            if (String(offset).trim().length > 0) {
                myqs.offset = `${offset}`;
            }
        }
        if (count != undefined) {
            if (String(count).trim().length > 0) {
                myqs.count = `${count}`;
            }
        }
        if (sort != undefined && sort.trim().length > 0) {
            myqs.sort = `${sort}`;
        }
        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupRelatedGroupUrl(groupPath, relationship))
            .setQueryStringParameters(myqs)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listGroupRelatedDevices(
        groupPath: string,
        relationship: string,
        template?: string,
        direction?: string,
        state?: DeviceState,
        offset?: number,
        count?: number,
        sort?: string,
        additionalHeaders?: RequestHeaders
    ): Promise<DeviceResourceList> {
        ow(groupPath, 'groupPath', ow.string.nonEmpty);
        ow(relationship, 'relationship', ow.string.nonEmpty);

        const myqs: Dictionary = {};
        if (template != undefined && template.trim().length > 0) {
            myqs.template = `${template}`;
        }
        if (direction != undefined && direction.trim().length > 0) {
            myqs.direction = `${direction}`;
        }
        if (state != undefined) {
            myqs.state = `${state}`;
        }
        if (offset != undefined) {
            if (String(offset).trim().length > 0) {
                myqs.offset = `${offset}`;
            }
        }
        if (count != undefined) {
            if (String(count).trim().length > 0) {
                myqs.count = `${count}`;
            }
        }
        if (sort != undefined && sort.trim().length > 0) {
            myqs.sort = `${sort}`;
        }
        const event = new LambdaApiGatewayEventBuilder()
            .setMethod('GET')
            .setPath(super.groupRelatedDeviceUrl(groupPath, relationship))
            .setQueryStringParameters(myqs)
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
