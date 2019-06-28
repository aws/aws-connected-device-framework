/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { DeviceModel, DeviceState, RelatedDeviceListResult, RelatedDeviceModel} from './devices.models';
import {logger} from '../utils/logger';
import {Node} from '../data/node';
import {TypeCategory} from '../types/constants';
import { TYPES } from '../di/types';
import { FullAssembler } from '../data/full.assembler';

@injectable()
export class DevicesAssembler {

    constructor( @inject(TYPES.FullAssembler) private fullAssembler: FullAssembler ) {}

    public toNode(model:DeviceModel): Node {
        logger.debug(`device.assembler toNode: in: model:${JSON.stringify(model)}`);

        const node = new Node();
        node.types.push(model.category);
        node.types.push(model.templateId);
        node.attributes['deviceId'] = model.deviceId;
        node.attributes['awsIotThingArn'] = model.awsIotThingArn;
        node.attributes['description'] = model.description;
        node.attributes['imageUrl'] = model.imageUrl;
        node.attributes['connected'] = model.connected;
        node.attributes['state'] = model.state;

        node.version = model.version;

        for(const p in model.attributes) {
            if (model.attributes.hasOwnProperty(p)) {
                node.attributes[p] = model.attributes[p];
            }
        }

        logger.debug(`device.assembler toNode: exit: node: ${JSON.stringify(node)}`);
        return node;
    }

    public toDeviceModels(nodes: Node[]): DeviceModel[] {
        logger.debug(`device.assembler toDeviceModels: in: node: ${JSON.stringify(nodes)}`);

        const devices:DeviceModel[]=[];
        for (const node of nodes) {
            devices.push(this.toDeviceModel(node));
        }

        return devices;

    }

    public toDeviceModel(node: Node): DeviceModel {
        logger.debug(`device.assembler toDeviceModel: in: node: ${JSON.stringify(node)}`);

        if (node===undefined) {
            logger.debug(`device.assembler toDeviceModel: exit: model: undefined`);
            return undefined;
        }

        const model = new DeviceModel();

        if (node.types.indexOf(TypeCategory.Component)>=0) {
            model.category = TypeCategory.Component;
        } else {
            model.category = TypeCategory.Device;
        }
        model.templateId = node.types.filter(t => t !== TypeCategory.Device && t !== TypeCategory.Component)[0];
        model.version = node.version;

        Object.keys(node.attributes).forEach( key => {
            switch(key) {
                case 'deviceId':
                    model.deviceId = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'awsIotThingArn':
                    model.awsIotThingArn = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'description':
                    model.description = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'imageUrl':
                    model.imageUrl = <string> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'connected':
                    model.connected = <boolean> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;
                case 'state':
                    model.state = <DeviceState> this.fullAssembler.extractPropertyValue(node.attributes[key]);
                    break;

                default:
                    model.attributes[key] = this.fullAssembler.extractPropertyValue(node.attributes[key]);
            }
        });

        this.assembleRelatedIn(model, node);

        this.assembleRelatedOut(model, node);

        // remove any empty collection attributes
        if (model.groups && Object.keys(model.groups).length===0) {
            delete model.groups;
        }
        if (model.devices && Object.keys(model.devices).length===0) {
            delete model.devices;
        }
        if (model.components &&model.components.length===0) {
            delete model.components;
        }

        logger.debug(`device.assembler toDeviceModel: exit: model: ${JSON.stringify(model)}`);
        return model;

    }

    private assembleRelatedIn(model:DeviceModel, node:Node) {
        Object.keys(node.in).forEach( key => {
            const others = node.in[key];
            if (others!==undefined) {
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups[key]===undefined) {
                            model.groups[key]=[];
                        }
                        model.groups[key].push((other.attributes['groupPath'] as string[])[0]);
                    } else if (other.category===TypeCategory.Device) {
                        if (model.devices[key]===undefined) {
                            model.devices[key]=[];
                        }
                        model.devices[key].push((other.attributes['deviceId'] as string[])[0]);
                    }
                });
            }
        });
    }

    private assembleRelatedOut(model:DeviceModel, node:Node) {
        Object.keys(node.out).forEach( key => {
            const others = node.out[key];
            if (others!==undefined) {
                others.forEach(other=> {
                    if (other.category===TypeCategory.Group) {
                        if (model.groups[key]===undefined) {
                            model.groups[key]=[];
                        }
                        model.groups[key].push((other.attributes['groupPath'] as string[])[0]);
                    } else if (other.category===TypeCategory.Device) {
                        if (model.devices[key]===undefined) {
                            model.devices[key]=[];
                        }
                        model.devices[key].push((other.attributes['deviceId'] as string[])[0]);
                    } else if (other.category===TypeCategory.Component) {
                        if (model.components===undefined) {
                            model.components=[];
                        }
                        model.components.push(this.toDeviceModel(other));
                    }
                });

            }
        });
    }

    public toRelatedDeviceModelsList(node: Node, offset?:number|string, count?:number): RelatedDeviceListResult {
        logger.debug(`devices.assembler toRelatedDeviceModelsList: in: node: ${JSON.stringify(node)}`);

        const r:RelatedDeviceListResult = {
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
                    const device: RelatedDeviceModel = this.toDeviceModel(other) as RelatedDeviceModel;
                    device.relation = relationship;
                    device.direction = 'in';
                    r.results.push(device);
                });
            }
        });

        Object.keys(node.out).forEach( relationship => {
            const others = node.out[relationship];
            if (others!==undefined) {
                others.forEach(other=> {
                    const device: RelatedDeviceModel = this.toDeviceModel(other) as RelatedDeviceModel;
                    device.relation = relationship;
                    device.direction = 'out';
                    r.results.push(device);
                });
            }
        });

        logger.debug(`groups.assembler toGroupModelList: exit: r: ${JSON.stringify(r)}`);
        return r;

    }
}
