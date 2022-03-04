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
import { GroupItem, GroupMemberItemList, determineIfGroup20Resource, Group10Resource, Group20Resource, GroupBaseResource, GroupItemList, GroupResourceList, GroupMemberResourceList, determineIfGroupItem, BulkGroupsResource} from './groups.models';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import { DevicesAssembler } from '../devices/devices.assembler';
import { TYPES } from '../di/types';
import {TypeCategory} from '../types/constants';
import { FullAssembler } from '../data/full.assembler';
import { determineIfDeviceItem } from '../devices/devices.models';
import { DirectionToRelatedEntityArrayMap, RelatedEntityArrayMap, StringArrayMap } from '../data/model';

@injectable()
export class GroupsAssembler {

    constructor( @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
    @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler  ) {}

    public toNode(model: GroupItem): Node {
        logger.debug(`groups.assembler toNode: in: model: ${JSON.stringify(model)}`);

        const node = new Node();
        node.types.push(model.category);
        node.types.push(model.templateId);
        node.attributes['name'] = model.name;
        node.attributes['groupPath'] = model.groupPath;
        node.attributes['parentPath'] = model.parentPath;
        node.attributes['description'] = model.description;
        node.version = model.version;

        for(const p in model.attributes) {
            if (model.attributes.hasOwnProperty(p)) {
                node.attributes[p] = model.attributes[p];
            }
        }

        logger.debug(`groups.assembler toNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public toGroupItems(nodes:Node[]): GroupItem[] {
        logger.debug(`groups.assembler toGroupItems: in: nodes: ${JSON.stringify(nodes)}`);

        const groups: GroupItem[]=[];
        for(const node of nodes) {
            groups.push(this.toGroupItem(node));
        }

        return groups;
    }
    public toGroupItem(node: Node): GroupItem {
        logger.debug(`groups.assembler toGroupItem: in: node: ${JSON.stringify(node)}`);

        if (node===undefined) {
            logger.debug(`groups.assembler toGroupItem: exit: model: undefined`);
            return undefined;
        }

        const model = new GroupItem();
        model.category = TypeCategory.Group;
        model.version = node.version;

        try {
            model.templateId = node.types.filter(t => t !== TypeCategory.Group)[0];
        } catch (err) {
            // do nothing, as templates don't exist in 'lite' mode
        }

        Object.keys(node.attributes).forEach( key => {
            switch(key) {
                case 'name':
                    model.name = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'groupPath':
                    model.groupPath = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'parentPath':
                    model.parentPath = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'description':
                    model.description = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                default:
                    model.attributes[key] = this.fullAssembler.extractPropertyValue(node.attributes[key]);
            }
        });

        if (model.name===undefined) {
            model.name=model.groupPath;
        }

        Object.keys(node.in).forEach( key => {
            const others = node.in[key];
            if (others!==undefined) {
                if (model.groups===undefined) {
                    model.groups= {};
                }
                if (model.groups.in===undefined) {
                    model.groups.in= {};
                }
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups.in[key]===undefined) {
                            model.groups.in[key]=[];
                        }
                        model.groups.in[key].push({id:(other.attributes['groupPath'] as string[])[0]});
                    }
                });
            }
        });

        Object.keys(node.out).forEach( key => {
            const others = node.out[key];
            if (others!==undefined) {
                if (model.groups===undefined) {
                    model.groups= {};
                }
                if (model.groups.out===undefined) {
                    model.groups.out= {};
                }
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups.out[key]===undefined) {
                            model.groups.out[key]=[];
                        }
                        model.groups.out[key].push({id:(other.attributes['groupPath'] as string[])[0]});
                    }
                });

            }
        });

        // remove any empty collection attributes
        if (model.groups) {
            if (model.groups.in && Object.keys(model.groups.in).length===0) {
                delete model.groups.in;
            }
            if (model.groups.out && Object.keys(model.groups.out).length===0) {
                delete model.groups.out;
            }
            if (Object.keys(model.groups).length===0) {
                delete model.groups;
            }
        }

        logger.debug(`groups.assembler toGroupItem: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    public fromGroupResource(res: GroupBaseResource): GroupItem {
        logger.debug(`group.assembler fromGroupResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`group.assembler fromGroupResource: exit: res: undefined`);
            return undefined;
        }

        const item = new GroupItem();

        // common properties
        Object.keys(res).forEach(key=> {
            if (key!=='groups') {
                item[key] = res[key];
            }
        });

        const assembleRelated = (from:StringArrayMap, rels:DirectionToRelatedEntityArrayMap, direction:'in'|'out')=> {
            if (from) {
                if (rels[direction] ===undefined) rels[direction] = {};
                for(const [relation,ids] of Object.entries(from)) {
                    rels[direction][relation] = ids.map(id=>({id}));
                }
            }
        }

        // populate version specific device info
        if (determineIfGroup20Resource(res)) {
            // v2.0 supports both incoming and outgoing links
            const res_2_0 = res as Group20Resource;
            assembleRelated(res_2_0.groups?.in, item.groups, 'in');
            assembleRelated(res_2_0.groups?.out, item.groups, 'out');
        } else {
            // as v1.0 only supports outgoing links, we default all to outgoing
            const res_1_0 = res as Group10Resource;
            if (res_1_0.groups) {
                assembleRelated(res_1_0.groups, item.groups, 'out');
            }
        }

        logger.debug(`group.assembler fromGroupResource: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public fromBulkGroupsResource(res: BulkGroupsResource): GroupItem[] {
        logger.debug(`group.assembler fromBulkGroupsResource: in: res: ${JSON.stringify(res)}`);

        if (res===undefined) {
            logger.debug(`group.assembler fromBulkGroupsResource: exit: res: undefined`);
            return undefined;
        }

        const items:GroupItem[] = [];

        res.groups.forEach(resource=> items.push(this.fromGroupResource(resource)));

        logger.debug(`group.assembler fromBulkGroupsResource: exit: items: ${JSON.stringify(items)}`);
        return items;

    }

    public toGroupResource(item: GroupItem, version:string): (GroupBaseResource) {
        logger.debug(`group.assembler toGroupResource: in: item: ${JSON.stringify(item)}, version:${version}`);

        if (item===undefined) {
            logger.debug(`group.assembler toGroupResource: exit: item: undefined`);
            return undefined;
        }

        const assembleRelated = (from:RelatedEntityArrayMap, to:StringArrayMap)=> {
            if (from) {
                for(const [relation,entities] of Object.entries(from)) {
                    if (to[relation]===undefined) {
                        to[relation]= [];
                    }
                    to[relation].push(...entities.map(entity=>entity.id));
                }
            }
        }

        let resource:GroupBaseResource;
        if (version.startsWith('1.')) {
            // v1 specific...
            resource = new Group10Resource();
            const typedResource:Group10Resource = resource;

            // populate version specific device info
            if (item.groups) {
                assembleRelated(item.groups?.in, typedResource.groups);
                assembleRelated(item.groups?.out, typedResource.groups);
            } else {
                delete typedResource.groups;
            }
        } else {
            // v2 specific...
            resource = new Group20Resource();
            const typedResource:Group20Resource = resource;

            // populate version specific device info
            typedResource.groups = {};
            if (item.groups?.in) {
                typedResource.groups.in = {}
            }
            assembleRelated(item.groups?.in, typedResource.groups.in);
            if (item.groups?.out) {
                typedResource.groups.out = {}
            }
            assembleRelated(item.groups?.out, typedResource.groups.out);
        }

        // common properties
        Object.keys(item).forEach(key=> {
            if (key!=='groups' && key!=='devices') {
                resource[key] = item[key];
            }
        });

        logger.debug(`group.assembler toGroupResource: exit: resource: ${JSON.stringify(resource)}`);
        return resource;

    }

    public toGroupResourceList(items: GroupItemList, version:string): (GroupResourceList) {
        logger.debug(`group.assembler toGroupResourceList: in: items: ${JSON.stringify(items)}, version:${version}`);

        if (items===undefined) {
            logger.debug(`group.assembler toGroupResourceList: exit: items: undefined`);
            return undefined;
        }

        const resources = new GroupResourceList();
        resources.pagination = items.pagination;
        resources.results = [];

        items.results.forEach(item=> resources.results.push(this.toGroupResource(item, version)));

        logger.debug(`group.assembler toGroupResourceList: exit: resources: ${JSON.stringify(resources)}`);
        return resources;

    }

    public toGroupMemberResourceList(items: GroupMemberItemList, version:string): (GroupMemberResourceList) {
        logger.debug(`group.assembler toGroupMemberResourceList: in: items: ${JSON.stringify(items)}, version:${version}`);

        if (items===undefined) {
            logger.debug(`group.assembler toGroupMemberResourceList: exit: items: undefined`);
            return undefined;
        }

        const resources:GroupMemberResourceList = {
            results:[],
            pagination: items.pagination
        };

        items.results.forEach(item=> {
            if (determineIfDeviceItem(item)) {
                resources.results.push(this.devicesAssembler.toDeviceResource(item, version));
            } else if (determineIfGroupItem(item)) {
                resources.results.push(this.toGroupResource(item, version));
            }
        });

        logger.debug(`group.assembler toGroupMemberResourceList: exit: resources: ${JSON.stringify(resources)}`);
        return resources;

    }

    public toGroupItemList(nodes: Node[]): GroupItem[] {
        logger.debug(`groups.assembler toGroupItemList: in: nodes: ${JSON.stringify(nodes)}`);

        if (nodes===undefined) {
            return [];
        }

        const models: GroupItem[] = [];

        for(const node of nodes) {
            models.push(this.toGroupItem(node));
        }

        logger.debug(`groups.assembler toGroupItemList: exit: models: ${JSON.stringify(models)}`);
        return models;

    }

    public toRelatedGroupItemList(node: Node, offset?:number|string, count?:number): GroupItemList {
        logger.debug(`groups.assembler toRelatedGroupItemList: in: node: ${JSON.stringify(node)}`);

        const r:GroupItemList = {
            results:[]
        };

        if (node===undefined) {
            return r;
        }

        if (offset!==undefined || count!==undefined) {
            r.pagination = {
                offset,
                count
            };

        }

        Object.keys(node.in).forEach( relationship => {
            const others = node.in[relationship];
            if (others!==undefined) {
                others.forEach(other=> {
                    const group: GroupItem = this.toGroupItem(other) as GroupItem;
                    group.relation = relationship;
                    group.direction = 'in';
                    r.results.push(group);
                });
            }
        });

        Object.keys(node.out).forEach( relationship => {
            const others = node.out[relationship];
            if (others!==undefined) {
                others.forEach(other=> {
                    const group: GroupItem = this.toGroupItem(other) as GroupItem;
                    group.relation = relationship;
                    group.direction = 'out';
                    r.results.push(group);
                });
            }
        });

        logger.debug(`groups.assembler toRelatedGroupItemList: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

    public toGroupMembersList(nodes: Node[], offset?:number|string, count?:number): GroupMemberItemList {
        logger.debug(`groups.assembler toGroupMembersList: in: nodes: ${JSON.stringify(nodes)}`);

        const r:GroupMemberItemList = {
            results:[]
        };

        if (nodes===undefined) {
            return r;
        }

        if (offset!==undefined || count!==undefined) {
            r.pagination = {
                offset,
                count
            };

        }

        for(const node of nodes) {
            if (node.types.indexOf(TypeCategory.Device)>=0) {
                r.results.push(this.devicesAssembler.toDeviceItem(node));
            } else if (node.types.indexOf(TypeCategory.Group)>=0) {
                r.results.push(this.toGroupItem(node));
            } else {
                logger.warn(`groups.assembler toGroupMembersList: unsupported template: ${node.types}`);
            }
        }

        logger.debug(`groups.assembler toGroupModelList: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

}
