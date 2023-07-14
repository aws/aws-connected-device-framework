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
    LAMBDAINVOKE_TYPES,
    LambdaApiGatewayEventBuilder,
    LambdaInvokerService,
} from '@awssolutions/cdf-lambda-invoke';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { RequestHeaders } from './common.model';
import { OrganizationalUnitResource } from './organizationalUnits.model';
import {
    OrganizationalUnitsService,
    OrganizationalUnitsServiceBase,
} from './organizationalUnits.service';

@injectable()
export class OrganizationalUnitsLambdaService
    extends OrganizationalUnitsServiceBase
    implements OrganizationalUnitsService
{
    private functionName: string;

    constructor(
        @inject(LAMBDAINVOKE_TYPES.LambdaInvokerService)
        private lambdaInvoker: LambdaInvokerService,
    ) {
        super();
        this.lambdaInvoker = lambdaInvoker;
        this.functionName = process.env.ORGANIZATIONMANAGER_API_FUNCTION_NAME;
    }

    async getOrganizationalUnit(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<OrganizationalUnitResource> {
        ow(organizationalUnitId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.organizationalUnitRelativeUrl(organizationalUnitId))
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }

    async deleteOrganizationalUnit(
        organizationalUnitId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void> {
        ow(organizationalUnitId, ow.string.nonEmpty);
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.organizationalUnitRelativeUrl(organizationalUnitId))
            .setMethod('DELETE')
            .setHeaders(super.buildHeaders(additionalHeaders));

        await this.lambdaInvoker.invoke(this.functionName, event);
    }

    async createOrganizationalUnit(
        organizationalUnit: OrganizationalUnitResource,
        additionalHeaders?: RequestHeaders,
    ): Promise<string> {
        ow(organizationalUnit, ow.object.nonEmpty);

        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.organizationalUnitsRelativeUrl())
            .setMethod('POST')
            .setHeaders(super.buildHeaders(additionalHeaders))
            .setBody(organizationalUnit);

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.header['x-organizationalUnitId'];
    }

    async listOrganizationalUnits(
        additionalHeaders?: RequestHeaders,
    ): Promise<OrganizationalUnitResource[]> {
        const event = new LambdaApiGatewayEventBuilder()
            .setPath(super.organizationalUnitsRelativeUrl())
            .setMethod('GET')
            .setHeaders(super.buildHeaders(additionalHeaders));

        const res = await this.lambdaInvoker.invoke(this.functionName, event);
        return res.body;
    }
}
