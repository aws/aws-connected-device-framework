/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from "inversify";
import ow from 'ow';
import { BulkComponentsService, BulkComponentsServiceBase } from './bulkComponents.service';
import { RequestHeaders } from './common.model';
import {
    BulkComponentsResource,
    BulkComponentsResult,
    ComponentResource,
} from './components.model';

@injectable()
export class BulkComponentsLambdaService
    extends BulkComponentsServiceBase
    implements BulkComponentsService
{
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ORGANIZATIONMANAGER_API_FUNCTION_NAME;
    }

    async bulkCreateComponents(
        organizationalUnitId: string,
        bulkComponentsResource: BulkComponentsResource,
        additionalHeaders?: RequestHeaders
    ): Promise<BulkComponentsResult> {
        ow(organizationalUnitId, ow.string.nonEmpty);
        ow(bulkComponentsResource, ow.object.nonEmpty);
        ow(bulkComponentsResource.components, ow.array.minLength(1));

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.componentsRelativeUrl(organizationalUnitId))
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(bulkComponentsResource);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async bulkGetComponents(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<ComponentResource[]> {
        ow(organizationalUnitId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.componentsRelativeUrl(organizationalUnitId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async bulkDeleteComponents(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders
    ): Promise<void> {
        ow(organizationalUnitId, ow.string.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.componentsRelativeUrl(organizationalUnitId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }
}