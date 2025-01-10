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
import { inject, injectable } from 'inversify';
import { TYPES } from '../../di/types';
import { EventsDao } from '../events.dao';
import { EventModel, StateHistoryModel } from '../events.models';
import { EventAction } from './eventaction.interfaces';

@injectable()
export class UpdateAction implements EventAction {
    constructor(@inject(TYPES.EventsDao) private eventsDao: EventsDao) {}

    async execute(event: EventModel): Promise<EventModel> {
        logger.debug(`eventaction.update execute: event:${JSON.stringify(event)}}`);

        // TODO: validation

        // retrieve the existing stored history
        const existingEvent = await this.eventsDao.getLatest(event.objectId);
        let existingState = {};
        if (existingEvent !== undefined) {
            // we have a latest
            existingState = JSON.parse(existingEvent.state);
        }
        // augment with the change
        let changedState;
        if (event.payload) {
            changedState = JSON.parse(event.payload);
        }
        const mergedState = Object.assign(existingState, changedState);

        if (event.attributes !== undefined) {
            if (event.attributes['attachedToGroup'] !== undefined) {
                if (mergedState['groups'] === undefined) {
                    mergedState['groups'] = {};
                }
                if (mergedState['groups']['out'] === undefined) {
                    mergedState['groups']['out'] = {};
                }
                if (mergedState['groups']['out'][event.attributes['relationship']] === undefined) {
                    mergedState['groups']['out'][event.attributes['relationship']] = [];
                }
                mergedState['groups']['out'][event.attributes['relationship']].push(
                    event.attributes['attachedToGroup']
                );
            } else if (event.attributes['detachedFromGroup'] !== undefined) {
                if (mergedState['groups']['out'] === undefined) {
                    mergedState['groups']['out'] = {};
                } else {
                    const newRelationship = mergedState['groups']['out'][
                        event.attributes['relationship']
                    ]?.filter((value: string) => {
                        return value !== event.attributes['detachedFromGroup'];
                    });

                    mergedState['groups']['out'][event.attributes['relationship']] =
                        newRelationship;
                }
            } else if (event.attributes['attachedToDevice'] !== undefined) {
                if (mergedState['devices'] === undefined) {
                    mergedState['devices'] = {};
                }
                if (mergedState['devices']['out'] === undefined) {
                    mergedState['devices']['out'] = {};
                }
                if (
                    mergedState['devices']['out'][event.attributes['relationship']] === undefined
                ) {
                    mergedState['devices']['out'][event.attributes['relationship']] = [];
                }
                mergedState['devices']['out'][event.attributes['relationship']].push(
                    event.attributes['attachedToDevice']
                );
            } else if (event.attributes['detachedFromDevice'] !== undefined) {
                if (mergedState['devices']['out'] === undefined) {
                    mergedState['devices']['out'] = {};
                } else {
                    const newRelationship = mergedState['devices']['out'][
                        event.attributes['relationship']
                    ]?.filter((value: string) => {
                        return value !== event.attributes['detachedFromDevice'];
                    });
                    mergedState['devices']['out'][event.attributes['relationship']] =
                        newRelationship;
                }
            }
        }

        if (existingEvent !== undefined) {
            if (event.event === 'modify' && event.type === 'devices') {
                const state = JSON.parse(existingEvent.state);
                if (state['groups'] !== undefined) {
                    mergedState['groups'] = state['groups'];
                }
                if (state['devices'] !== undefined) {
                    mergedState['devices'] = state['devices'];
                }
            }
        }

        // update the incoming event so actions may be chained
        event.payload = JSON.stringify(mergedState);

        // finally, save the versions
        const toSave: StateHistoryModel = {
            objectId: event.objectId,
            type: event.type,
            time: event.time,
            event: event.event,
            user: event.user,
            state: event.payload,
        };

        const toUpdate: StateHistoryModel = {
            ...toSave,
            time: 'latest',
        };
        await this.eventsDao.create(toSave);
        // If there is no "latest" event, then we need to create it...not update it
        // This is probably an error getting here (like when the item was initially created, it didn't get the latest entry),
        // but we should recover gracefully from it
        if (existingEvent === undefined) {
            await this.eventsDao.create(toUpdate);
        } else {
            await this.eventsDao.update(toUpdate);
        }

        return event;
    }
}
