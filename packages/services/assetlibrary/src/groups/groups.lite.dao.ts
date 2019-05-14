/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import {logger} from '../utils/logger';
import {TYPES} from '../di/types';
import {Node} from '../data/node';
import { Iot } from 'aws-sdk';
import { TypeCategory } from '../types/constants';

@injectable()
export class GroupsDaoLite {

    private readonly iot: AWS.Iot;

    public constructor(
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot) {
            this.iot = iotFactory();
    }

    public async get(groupId: string): Promise<Node> {
        logger.debug(`groups.lite.dao get: in: groupId: ${groupId}`);

        const params:Iot.Types.DescribeThingGroupRequest = {
            thingGroupName: groupId
        };

        const r = await this.iot.describeThingGroup(params).promise();

        const node = this.assembleNode(r);

        logger.debug(`groups.lite.dao get: exit: node: ${JSON.stringify(node)}`);
        return node;

    }

    private assembleNode(group:Iot.Types.DescribeThingGroupResponse ):Node {
        logger.debug(`groups.lite.dao assembleNode: in: group: ${JSON.stringify(group)}`);

        const node = new Node();
        node.id = group.thingGroupName;
        node.attributes['groupPath'] = group.thingGroupName;
        node.attributes['description'] = group.thingGroupProperties.thingGroupDescription;

        Object.keys(group.thingGroupProperties.attributePayload.attributes).forEach( key => {
            node.attributes[key] = group.thingGroupProperties.attributePayload.attributes[key] ;
        });

        logger.debug(`groups.lite.dao assembleNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public async create(n: Node): Promise<string> {
        logger.debug(`groups.lite.dao create: in: n:${JSON.stringify(n)}`);

        let parent;
        const parentPath = <string> n.attributes['parentPath'];
        if (parentPath) {
            parent = parentPath.substr(parentPath.lastIndexOf('/')+1);
        }

        const params:Iot.Types.CreateThingGroupRequest = {
            thingGroupName: <string> n.attributes['groupPath'],
            parentGroupName: parent,
            thingGroupProperties: {
                attributePayload: {
                    attributes: {}
                }
            }
        };

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key]!==undefined) {
                if (key==='name') {
                    continue;
                } else if (key==='description') {
                    params.thingGroupProperties.thingGroupDescription = <string> n.attributes[key];
                } else {
                    params.thingGroupProperties.attributePayload.attributes[key] = <string> n.attributes[key];
                }
            }
        }

        const r = await this.iot.createThingGroup(params).promise();

        logger.debug(`groups.lite.dao create: exit: id:${r.thingGroupName}`);
        return r.thingGroupName;

    }

    public async update(n: Node): Promise<number> {
        logger.debug(`groups.lite.dao update: in: n:${JSON.stringify(n)}`);

        const params:Iot.Types.UpdateThingGroupRequest = {
            thingGroupName: <string> n.attributes['groupPath'],
            thingGroupProperties: {
                attributePayload: {
                    attributes: {}
                }
            },
            expectedVersion: n.version
        };

        for (const key of Object.keys(n.attributes)) {
            if (n.attributes[key]!==undefined) {
                if (key==='name') {
                    continue;
                } else if (key==='description') {
                    params.thingGroupProperties.thingGroupDescription = <string> n.attributes[key];
                } else {
                    params.thingGroupProperties.attributePayload.attributes[key] = <string> n.attributes[key];
                }
            }
        }

        const r = await this.iot.updateThingGroup(params).promise();

        logger.debug(`groups.lite.dao update: exiid:${r.version}`);
        return r.version;

    }

    public async listDeviceMembers(groupPath:string,  maxResults?:number, nextToken?:string): Promise<ListMembersResponse> {
        logger.debug(`groups.lite.dao listDeviceMembers: in: groupPath:${groupPath}, maxResults:${maxResults}, nextToken:${nextToken}`);

        const params: Iot.Types.ListThingsInThingGroupRequest = {
            thingGroupName: groupPath,
            nextToken,
            maxResults
        };

        const result = await this.iot.listThingsInThingGroup(params).promise();

        logger.debug(`groups.lite.dao listDeviceMembers: result: ${JSON.stringify(result)}`);

        const nodes: Node[] = [];
        for(const thing of result.things) {
            const n = new Node();
            n.attributes['deviceId'] = thing;
            n.types.push(TypeCategory.Device);
            nodes.push(n);
        }

        logger.debug(`groups.lite.dao listDeviceMembers: exit: node: ${JSON.stringify(nodes)}`);
        return {nodes, nextToken:result.nextToken};

    }

    public async listGroupMembers(groupPath:string,  maxResults?:number, nextToken?:string): Promise<ListMembersResponse> {
        logger.debug(`groups.lite.dao listGroupMembers: in: groupPath:${groupPath}, maxResults:${maxResults}, nextToken:${nextToken}`);

        const params: Iot.Types.ListThingGroupsRequest = {
            parentGroup: groupPath,
            nextToken,
            maxResults
        };

        const result = await this.iot.listThingGroups(params).promise();

        logger.debug(`groups.lite.dao listGroupMembers: result: ${JSON.stringify(result)}`);

        const nodes: Node[] = [];
        for(const group of result.thingGroups) {
            const n = new Node();
            n.attributes['name'] = group.groupName;
            n.attributes['groupPath'] = group.groupName;
            n.types.push(TypeCategory.Group);
            nodes.push(n);
        }

        logger.debug(`groups.lite.dao listGroupMembers: exit: node: ${JSON.stringify(nodes)}`);
        return {nodes, nextToken:result.nextToken};

    }

    public async delete(groupPath: string, expectedVersion:number): Promise<void> {
        logger.debug(`groups.lite.dao delete: in: groupPath:${groupPath}, expectedVersion:${expectedVersion}`);

        const params: Iot.Types.DeleteThingGroupRequest = {
            thingGroupName: groupPath,
            expectedVersion
        };

        await this.iot.deleteThingGroup(params).promise();

        logger.debug(`groups.lite.dao delete: exit`);
    }
}

export interface ListMembersResponse {
    nodes: Node[];
    nextToken: string;
}
