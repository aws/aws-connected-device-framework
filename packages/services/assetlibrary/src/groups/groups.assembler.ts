/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { GroupModel, GroupsMembersModel, RelatedGroupListModel, RelatedGroupModel} from './groups.models';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import { DevicesAssembler } from '../devices/devices.assembler';
import { TYPES } from '../di/types';
import {TypeCategory} from '../types/constants';
import { FullAssembler } from '../data/full.assembler';

@injectable()
export class GroupsAssembler {

    constructor( @inject(TYPES.DevicesAssembler) private devicesAssembler: DevicesAssembler,
    @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler  ) {}

    public toNode(model: GroupModel): Node {
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

    public toGroupModel(node: Node): GroupModel {
        logger.debug(`groups.assembler toGroupModel: in: node: ${JSON.stringify(node)}`);

        if (node===undefined) {
            logger.debug(`groups.assembler toGroupModel: exit: model: undefined`);
            return undefined;
        }

        const model = new GroupModel();
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
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups[key]===undefined) {
                            model.groups[key]=[];
                        }
                        model.groups[key].push((other.attributes['groupPath'] as string[])[0]);
                    }
                });
            }
        });

        Object.keys(node.out).forEach( key => {
            const others = node.out[key];
            if (others!==undefined) {
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups[key]===undefined) {
                            model.groups[key]=[];
                        }
                        model.groups[key].push((other.attributes['groupPath'] as string[])[0]);
                    }
                });

            }
        });

        // remove any empty collection attributes
        if (model.groups && Object.keys(model.groups).length===0) {
            delete model.groups;
        }

        logger.debug(`groups.assembler toGroupModel: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    public toGroupModelList(nodes: Node[]): GroupModel[] {
        logger.debug(`groups.assembler toGroupModelList: in: nodes: ${JSON.stringify(nodes)}`);

        if (nodes===undefined) {
            return [];
        }

        const models: GroupModel[] = [];

        for(const node of nodes) {
            models.push(this.toGroupModel(node));
        }

        logger.debug(`groups.assembler toGroupModelList: exit: models: ${JSON.stringify(models)}`);
        return models;

    }

    public toRelatedGroupModelsList(node: Node, offset?:number|string, count?:number): RelatedGroupListModel {
        logger.debug(`groups.assembler toRelatedGroupModelsList: in: node: ${JSON.stringify(node)}`);

        const r:RelatedGroupListModel = {
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
                    const group: RelatedGroupModel = this.toGroupModel(other) as RelatedGroupModel;
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
                    const group: RelatedGroupModel = this.toGroupModel(other) as RelatedGroupModel;
                    group.relation = relationship;
                    group.direction = 'out';
                    r.results.push(group);
                });
            }
        });

        logger.debug(`groups.assembler toRelatedGroupModelsList: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

    public toGroupMembersList(nodes: Node[], offset?:number|string, count?:number): GroupsMembersModel {
        logger.debug(`groups.assembler toGroupMembersList: in: nodes: ${JSON.stringify(nodes)}`);

        const r:GroupsMembersModel = {
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
                r.results.push(this.devicesAssembler.toDeviceModel(node));
            } else if (node.types.indexOf(TypeCategory.Group)>=0) {
                r.results.push(this.toGroupModel(node));
            } else {
                logger.warn(`groups.assembler toGroupMembersList: unsupported template: ${node.types}`);
            }
        }

        logger.debug(`groups.assembler toGroupModelList: exit: r: ${JSON.stringify(r)}`);
        return r;

    }

}
