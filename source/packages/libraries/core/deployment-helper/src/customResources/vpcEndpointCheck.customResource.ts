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
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import { CustomResourceEvent } from './customResource.model';
import { CustomResource } from './customResource';

@injectable()
export class VpcEndpointCheckCustomResource implements CustomResource {
    private ec2: AWS.EC2;

    constructor(@inject(TYPES.EC2Factory) ec2Factory: () => AWS.EC2) {
        this.ec2 = ec2Factory();
    }

    public async create(
        customResourceEvent: CustomResourceEvent,
    ): Promise<VpcEndpointCheckCustomResponse> {
        const vpcId = customResourceEvent.ResourceProperties.VpcId;
        const region = customResourceEvent.ResourceProperties.Region;
        const serviceName = customResourceEvent.ResourceProperties.ServiceName;

        const params: AWS.EC2.Types.DescribeVpcEndpointsRequest = {
            Filters: [
                {
                    Name: 'vpc-id',
                    Values: [`${vpcId}`],
                },
                {
                    Name: 'service-name',
                    Values: [`com.amazonaws.${region}.${serviceName}`],
                },
            ],
        };

        const result = await this.ec2.describeVpcEndpoints(params).promise();

        return {
            isNotEnabled: result.VpcEndpoints?.length === 0,
        };
    }

    public async update(
        customResourceEvent: CustomResourceEvent,
    ): Promise<VpcEndpointCheckCustomResponse> {
        return this.create(customResourceEvent);
    }

    public async delete(
        _customResourceEvent: CustomResourceEvent,
    ): Promise<VpcEndpointCheckCustomResponse> {
        return {};
    }
}

export interface VpcEndpointCheckCustomResponse {
    isNotEnabled?: boolean;
}
