/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { EventActionFactory } from './actions/eventaction.factory';
import { EventModel } from './events.models';
import { EventAction } from './actions/eventaction.interfaces';
import { UnsupportedAction } from './actions/eventaction.unsupported';

@injectable()
export class EventsService {

    constructor(
        @inject(TYPES.EventActionFactory) private eventActionFactory: EventActionFactory) {}

    public async create(event: EventModel) : Promise<void> {
        logger.debug(`events.service create: in: event: ${JSON.stringify(event)}`);

        // TODO validation

        // determine the action to take based on the status
        const actions:EventAction[] = this.eventActionFactory.getAction(event);

        if (actions===null || actions.length===0) {
            throw new Error('UNSUPPORTED_ACTION');
        }

        // perform the actions
        let chainedEvent = event;
        for (const a of actions) {
            if (a instanceof UnsupportedAction) {
                throw new Error('UNSUPPORTED_ACTION');
            } else {
                chainedEvent = await a.execute(chainedEvent);
                if (chainedEvent===null) {
                    throw new Error('ACTION_FAILED');
                }

            }
        }

        logger.debug('events.service create: exit:');
    }

}
