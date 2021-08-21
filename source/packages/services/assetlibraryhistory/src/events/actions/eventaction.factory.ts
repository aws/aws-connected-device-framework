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
import { logger } from '../../utils/logger';
import { inject, injectable } from 'inversify';
import { TYPES } from '../../di/types';
import { EventModel, Category, EventType } from '../events.models';
import { CreateAction } from './eventaction.create';
import { EventAction } from './eventaction.interfaces';
import { UnsupportedAction } from './eventaction.unsupported';
import { UpdateAction } from './eventaction.update';
import { DeleteAction } from './eventaction.delete';
import { UpdateComponentParentAction } from './eventaction.updateComponentParent';
import { PublishTemplateAction } from './eventaction.publishTemplate';

@injectable()
export class EventActionFactory {

    constructor(
        @inject(TYPES.CreateEventAction) private createAction: CreateAction,
        @inject(TYPES.UpdateEventAction) private updateAction: UpdateAction,
        @inject(TYPES.UpdateComponentParentEventAction) private updateComponentParentAction: UpdateComponentParentAction,
        @inject(TYPES.DeleteEventAction) private deleteAction: DeleteAction,
        @inject(TYPES.PublishTemplateEventAction) private publishTemplateAction: PublishTemplateAction,
        @inject(TYPES.UnsupportedEventAction) private unsupportedAction: UnsupportedAction) {}

    public getAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getAction: event:${JSON.stringify(event)}}`);

        let actions:EventAction[];

        switch (event.type) {
            case Category.devices:
                actions = this.getDeviceAction(event);
                break;
            case Category.groups:
                actions = this.getGroupAction(event);
                break;
            case Category.deviceTemplates:
                actions = this.getDeviceTemplateAction(event);
                break;
            case Category.groupTemplates:
                actions = this.getGroupTemplateAction(event);
                break;
            case Category.policies:
                actions = this.getPolicyAction(event);
                break;
            default:
                actions = [this.unsupportedAction];
        }

        logger.debug(`eventaction.factory getAction: exit:${actions}`);
        return actions;

    }

    private getDeviceAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getDeviceAction: event:${JSON.stringify(event)}}`);

        if (event.event===EventType.create ) {
            if (this.isComponentEvent(event)) {
                // save component, retrieve parent, update parent with component, save parent
                return [this.createAction, this.updateComponentParentAction];
            } else {
                return [this.createAction];
            }
        } else if (event.event===EventType.modify) {
            return [this.updateAction];
        } else if (event.event===EventType.delete) {
            if (this.isComponentEvent(event)) {
                // delete component, retrieve parent, remove parent from component, save parent
                return [this.deleteAction, this.updateComponentParentAction];
            } else {
                return [this.deleteAction];
            }
        } else {
            return [this.unsupportedAction];
        }
    }

    private getGroupAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getGroupAction: event:${JSON.stringify(event)}}`);

        if (event.event===EventType.create) {
            return [this.createAction];
        } else if (event.event===EventType.modify) {
            return [this.updateAction];
        } else if (event.event===EventType.delete) {
            return [this.deleteAction];
        } else {
            return [this.unsupportedAction];
        }
    }

    private getDeviceTemplateAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getDeviceTemplateAction: event:${JSON.stringify(event)}}`);

        if (event.event===EventType.create ) {
            return [this.createAction];
        } else if (event.event===EventType.modify) {
            if (event.payload===undefined && event.attributes!==undefined) {
                return [this.publishTemplateAction];
            } else {
                return [this.updateAction];
            }
        } else if (event.event===EventType.delete) {
            return [this.deleteAction];
        } else {
            return [this.unsupportedAction];
        }
    }

    private getGroupTemplateAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getGroupTemplateAction: event:${JSON.stringify(event)}}`);

        if (event.event===EventType.create  ) {
            return [this.createAction];
        } else if (event.event===EventType.modify) {
            if (event.payload===undefined && event.attributes!==undefined) {
                return [this.publishTemplateAction];
            } else {
                return [this.updateAction];
            }
        } else if (event.event===EventType.delete) {
            return [this.deleteAction];
        } else {
            return [this.unsupportedAction];
        }
    }

    private getPolicyAction(event:EventModel): EventAction[] {
        logger.debug(`eventaction.factory getPolicyction: event:${JSON.stringify(event)}}`);

        if (event.event===EventType.create ) {
            return [this.createAction];
        } else if (event.event===EventType.modify) {
            return [this.updateAction];
        } else if (event.event===EventType.delete) {
            return [this.deleteAction];
        } else {
            return [this.unsupportedAction];
        }
    }

    private isComponentEvent(event:EventModel): boolean {
        const isEvent = (event.attributes!==undefined && event.attributes['componentId']!==undefined);
        logger.debug(`eventaction.factory isComponentEvent: isEvent:${isEvent}`);
        return isEvent;
    }

}
