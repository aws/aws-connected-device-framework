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
/* tslint:disable:no-unused-variable member-ordering */

import { injectable } from 'inversify';
import * as request from 'superagent';
import { RequestHeaders } from './common.model';
import { TemplateUsage } from './fleet.model';
import { FleetService, FleetServiceBase } from './fleet.service';

@injectable()
export class FleetApigwService extends FleetServiceBase implements FleetService {

    private readonly baseUrl: string;

    public constructor() {
        super();
        this.baseUrl = process.env.GREENGRASSPROVISIONING_BASE_URL;
    }

    async getFleetSummary(additionalHeaders?: RequestHeaders): Promise<TemplateUsage> {
        const url = `${this.baseUrl}${super.fleetRelativeUrl('summary')}`;

        const res = await request.get(url)
            .set(this.buildHeaders(additionalHeaders));
        return res.body;

    }
}
