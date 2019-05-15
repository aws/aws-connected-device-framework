/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import { DeviceModel, DeviceModelAttributeValue, DeviceState} from './devices.models';
import {logger} from '../utils/logger';
import {Node, AttributeValue} from '../data/node';
import {TypeCategory} from '../types/constants';

@injectable()
export class DevicesAssembler {

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
                    model.deviceId = <string> this.extractPropertyValue(node.attributes[key]);
                    break;
                case 'awsIotThingArn':
                    model.awsIotThingArn = <string> this.extractPropertyValue(node.attributes[key]);
                    break;
                case 'description':
                    model.description = <string> this.extractPropertyValue(node.attributes[key]);
                    break;
                case 'imageUrl':
                    model.imageUrl = <string> this.extractPropertyValue(node.attributes[key]);
                    break;
                case 'connected':
                    model.connected = <boolean> this.extractPropertyValue(node.attributes[key]);
                    break;
                case 'state':
                    model.state = <DeviceState> this.extractPropertyValue(node.attributes[key]);
                    break;

                default:
                    model.attributes[key] = this.extractPropertyValue(node.attributes[key]);
            }
        });

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

    private extractPropertyValue(v: AttributeValue): DeviceModelAttributeValue {
        if (Array.isArray(v)) {
            return v[0];
        } else {
            return v;
        }
    }
}
