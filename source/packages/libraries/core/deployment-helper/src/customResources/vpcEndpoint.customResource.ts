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
import { logger } from '@awssolutions/simple-cdf-logger';
import { VpcEndpointRouteTableIdList, VpcEndpointSubnetIdList } from 'aws-sdk/clients/ec2';
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { CustomResource } from './customResource';
import { CustomResourceEvent } from './customResource.model';

@injectable()
export class VpcEndpointCustomResource implements CustomResource {
    private ec2: AWS.EC2;

    constructor(@inject(TYPES.EC2Factory) ec2Factory: () => AWS.EC2) {
        this.ec2 = ec2Factory();
    }

    public async create(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `VpcEndpointCustomResource: create: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const vpcId = customResourceEvent.ResourceProperties.VpcId;
        const region = customResourceEvent.ResourceProperties.Region;
        const serviceName = customResourceEvent.ResourceProperties.ServiceName;
        const routeTableIds = (customResourceEvent.ResourceProperties.RouteTableIds ||
            []) as VpcEndpointRouteTableIdList;
        let policyDocument = customResourceEvent.ResourceProperties.PolicyDocument || '';
        const privateDnsEnabled =
            customResourceEvent.ResourceProperties.PrivateDnsEnabled === 'true';
        const subnetIds = (customResourceEvent.ResourceProperties.SubnetIds ||
            []) as VpcEndpointSubnetIdList;
        const vpcEndpointType =
            customResourceEvent.ResourceProperties.VpcEndpointType || 'Gateway';

        if (policyDocument !== '') {
            policyDocument = JSON.stringify(JSON.parse(policyDocument));
        }

        const endpoint = `com.amazonaws.${region}.${serviceName}`;

        const existingEndpoints = await this.getVpcEndpoint(vpcId, endpoint);

        if (existingEndpoints.length === 0) {
            const vpcConfig: AWS.EC2.CreateVpcEndpointRequest = {
                VpcId: null,
                ServiceName: null,
            };

            switch (serviceName) {
                case 's3': {
                    vpcConfig.VpcId = vpcId;
                    vpcConfig.ServiceName = endpoint;
                    vpcConfig.PolicyDocument = policyDocument;
                    vpcConfig.RouteTableIds = routeTableIds;
                    break;
                }
                case 'dynamodb': {
                    vpcConfig.VpcId = vpcId;
                    vpcConfig.ServiceName = endpoint;
                    vpcConfig.PolicyDocument = policyDocument;
                    vpcConfig.RouteTableIds = routeTableIds;
                    break;
                }
                case 'execute-api': {
                    vpcConfig.VpcId = vpcId;
                    vpcConfig.ServiceName = endpoint;
                    vpcConfig.PrivateDnsEnabled = privateDnsEnabled;
                    vpcConfig.SubnetIds = subnetIds;
                    vpcConfig.VpcEndpointType = vpcEndpointType;
                    break;
                }
                default:
                    break;
            }

            const result: AWS.EC2.CreateVpcEndpointResult = await this.createVpcEndpoint(
                vpcConfig,
            );

            logger.debug(
                `VpcEndpointCustomResource: createVpcEndpoint: out: result: ${JSON.stringify(
                    result,
                )}`,
            );

            return {
                endpoint: result.VpcEndpoint.ServiceName,
            };
        }
        return {};
    }

    public async update(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        return this.create(customResourceEvent);
    }

    public async delete(customResourceEvent: CustomResourceEvent): Promise<unknown> {
        logger.debug(
            `VpcEndpointCustomResource: delete: in: customResourceEvent: ${JSON.stringify(
                customResourceEvent,
            )}`,
        );

        const vpcId = customResourceEvent.ResourceProperties.VpcId;
        const region = customResourceEvent.ResourceProperties.Region;
        const serviceName = customResourceEvent.ResourceProperties.ServiceName;

        const endpoint = `com.amazonaws.${region}.${serviceName}`;

        const existingEndpoints = await this.getVpcEndpoint(vpcId, endpoint);

        if (existingEndpoints?.length !== 0) {
            return await this.deleteVpcEndpoint(existingEndpoints[0].VpcEndpointId);
        }

        return {};
    }

    private async getVpcEndpoint(
        vpcId: string,
        endpoint: string,
    ): Promise<AWS.EC2.Types.VpcEndpoint[]> {
        logger.debug(
            `VpcEndpointCustomResource: getVpcEndpoint: in: vpcId: ${JSON.stringify(
                vpcId,
            )}, endpoint: ${endpoint}`,
        );

        const params: AWS.EC2.Types.DescribeVpcEndpointsRequest = {
            Filters: [
                {
                    Name: 'vpc-id',
                    Values: [`${vpcId}`],
                },
                {
                    Name: 'service-name',
                    Values: [`${endpoint}`],
                },
            ],
        };

        const result = await this.ec2.describeVpcEndpoints(params).promise();

        logger.debug(
            `VpcEndpointCustomResource: getVpcEndpoint: out: VpcEndpoints: ${JSON.stringify(
                result,
            )}`,
        );

        return result.VpcEndpoints;
    }

    private async createVpcEndpoint(
        vpcConfig: AWS.EC2.CreateVpcEndpointRequest,
    ): Promise<AWS.EC2.CreateVpcEndpointResult> {
        logger.debug(
            `VpcEndpointCustomResource: createVpcEndpoint: in: vpcConfig: ${JSON.stringify(
                vpcConfig,
            )}`,
        );
        return await this.ec2.createVpcEndpoint(vpcConfig).promise();
    }

    private async deleteVpcEndpoint(vpcEndpointId: string) {
        return await this.ec2.deleteVpcEndpoints({
            VpcEndpointIds: [vpcEndpointId],
        });
    }
}
