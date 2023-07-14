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
import { Iot } from 'aws-sdk';
import { inject, injectable } from 'inversify';
import { Node } from '../data/node';
import { TYPES } from '../di/types';
import { TypeCategory } from '../types/constants';

@injectable()
export class DevicesDaoLite {
    private readonly iot: AWS.Iot;

    public constructor(@inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
        this.iot = iotFactory();
    }

    public async get(deviceId: string): Promise<Node> {
        logger.debug(`devices.lite.dao get: in: deviceIds:${deviceId}`);

        const thingFuture = this.iot.describeThing({ thingName: deviceId }).promise();

        const groupsFuture = this.iot.listThingGroupsForThing({ thingName: deviceId }).promise();

        const results = await Promise.all([thingFuture, groupsFuture]);
        const thing = results[0];
        const groups = results[1];

        while (groups.nextToken !== undefined && groups.nextToken !== null) {
            const nextGroups = await this.iot
                .listThingGroupsForThing({ thingName: deviceId, nextToken: groups.nextToken })
                .promise();
            groups.thingGroups = groups.thingGroups.concat(nextGroups.thingGroups);
            groups.nextToken = nextGroups.nextToken;
        }

        const node = this.assembleNode(thing);
        this.assembleAssociations(node, groups.thingGroups);

        logger.debug(`device.lite.dao get: exit: nodes: ${JSON.stringify(node)}`);
        return node;
    }

    private assembleNode(device: Iot.Types.DescribeThingResponse): Node {
        logger.debug(`devices.lite.dao assembleNode: in: device: ${JSON.stringify(device)}`);

        const node = new Node();
        node.id = device.thingId;
        node.types.push(TypeCategory.Device);
        if (device.thingTypeName !== null) {
            node.types.push(device.thingTypeName);
        }
        node.attributes['deviceId'] = device.thingName;
        node.attributes['awsIotThingArn'] = device.thingArn;
        node.version = device.version;
        node.category = TypeCategory.Device;
        Object.keys(device.attributes).forEach((key) => {
            node.attributes[key] = device.attributes[key];
        });

        logger.debug(`devices.lite.dao assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    private assembleAssociations(node: Node, r: Iot.Types.GroupNameAndArn[]) {
        logger.debug(
            `devices.lite.dao assembleAssociations: in: node: ${JSON.stringify(
                node,
            )}, r:${JSON.stringify(r)}`,
        );

        // assemble all associated objects
        r.forEach((g) => {
            const other = new Node();
            other.attributes['groupPath'] = [g.groupName];
            other.category = TypeCategory.Group;
            node.addLink('out', 'group', other);
        });

        logger.debug(`devices.lite.dao assembleAssociations: exit: ${JSON.stringify(node)}`);
    }

    public async create(n: Node, groups: string[]): Promise<string> {
        logger.debug(
            `devices.lite.dao create: in: n:${JSON.stringify(n)}, groups:${JSON.stringify(
                groups,
            )}`,
        );

        const thingParams: Iot.Types.CreateThingRequest = {
            thingName: <string>n.attributes['deviceId'],
            thingTypeName: <string>n.types.filter((t) => t !== TypeCategory.Device)[0],
            attributePayload: {
                attributes: {},
            },
        };

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key] !== undefined) {
                if (key === 'name') {
                    continue;
                } else {
                    thingParams.attributePayload.attributes[key] = <string>n.attributes[key];
                }
            }
        }

        logger.debug(`devices.lite.dao create: thingParams: ${JSON.stringify(thingParams)}`);
        /*  create the device  */
        await this.iot.createThing(thingParams).promise();

        /*  associate with the groups  */
        if (groups?.length ?? 0 > 0) {
            for (const g of groups) {
                await this.attachToGroup(thingParams.thingName, g);
            }
        }

        logger.debug(`devices.lite.dao create: exit: thingName:${thingParams.thingName}`);
        return thingParams.thingName;
    }

    public async update(n: Node): Promise<void> {
        logger.debug(`devices.lite.dao update: in: n:${JSON.stringify(n)}`);

        const params: Iot.Types.UpdateThingRequest = {
            thingName: <string>n.attributes['deviceId'],
            thingTypeName: <string>n.types.filter((t) => t !== TypeCategory.Device)[0],
            attributePayload: {
                attributes: {},
            },
            expectedVersion: n.version,
        };

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key] !== undefined) {
                params.attributePayload.attributes[key] = <string>n.attributes[key];
            }
        }

        await this.iot.updateThing(params).promise();

        logger.debug(`devices.lite.dao update: exit:`);
    }

    public async delete(deviceId: string, version?: number): Promise<void> {
        logger.debug(`devices.lite.dao delete: in: deviceId:${deviceId}, version:${version}`);

        const params: Iot.Types.DeleteThingRequest = {
            thingName: deviceId,
            expectedVersion: version,
        };

        await this.iot.deleteThing(params).promise();

        logger.debug(`devices.lite.dao delete: exit`);
    }

    public async attachToGroup(deviceId: string, groupPath: string): Promise<void> {
        logger.debug(
            `device.lite.dao attachToGroup: in: deviceId:${deviceId}, groupPath:${groupPath}`,
        );

        const params: Iot.Types.AddThingToThingGroupRequest = {
            thingName: deviceId,
            thingGroupName: groupPath,
        };

        await this.iot.addThingToThingGroup(params).promise();

        logger.debug(`devices.lite.dao attachToGroup: exit:`);
    }

    public async detachFromGroup(deviceId: string, groupPath: string): Promise<void> {
        logger.debug(
            `device.lite.dao detachFromGroup: in: deviceId:${deviceId}, groupPath:${groupPath}`,
        );

        const params: Iot.Types.RemoveThingFromThingGroupRequest = {
            thingName: deviceId,
            thingGroupName: groupPath,
        };

        await this.iot.removeThingFromThingGroup(params).promise();

        logger.debug(`devices.lite.dao detachFromGroup: exit:`);
    }
}
