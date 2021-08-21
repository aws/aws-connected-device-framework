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
import {inject, injectable} from 'inversify';
import ow from 'ow';
import {RequestHeaders} from './common.model';
import { LambdaInvokerService, LAMBDAINVOKE_TYPES, LambdaApiGatewayEventBuilder } from '@cdf/lambda-invoke';
import { GroupsServiceBase, GroupsService } from './groups.service';
import { GroupList, Group } from './groups.model';

@injectable()
export class GroupsLambdaService extends GroupsServiceBase implements GroupsService {

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService) private lambdaInvoker: LambdaInvokerService,
        @inject('greengrassProvisioning.apiFunctionName') private functionName : string
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
    }

    async createGroups(groups:Group[], additionalHeaders?:RequestHeaders) : Promise<GroupList> {

        ow(groups, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody({groups});

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async getGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<Group> {
        ow(groupName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupRelativeUrl(groupName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteGroupByName(groupName:string, additionalHeaders?:RequestHeaders) : Promise<void> {
        ow(groupName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupRelativeUrl(groupName))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async listByTemplate(templateName:string, additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(templateName, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupsByTemplateRelativeUrl(templateName))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async listByTemplateVersion(templateName:string, versionNo:number, additionalHeaders?:RequestHeaders) : Promise<GroupList> {
        ow(templateName, ow.string.nonEmpty);
        ow(versionNo, ow.number.greaterThan(0));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.groupsByTemplateVersionRelativeUrl(templateName, versionNo))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

}
