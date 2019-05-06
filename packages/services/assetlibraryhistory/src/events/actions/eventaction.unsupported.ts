/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { logger } from '../../utils/logger';
import { injectable } from 'inversify';
import { EventModel } from '../events.models';
import { EventAction } from './eventaction.interfaces';

@injectable()
export class UnsupportedAction implements EventAction {

    async execute(event:EventModel): Promise<EventModel> {
        logger.debug(`eventaction.unsupportAction execute: event:${JSON.stringify(event)}`);

        return null;
    }

}
