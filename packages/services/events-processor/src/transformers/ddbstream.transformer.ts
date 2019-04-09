
import { injectable, inject } from 'inversify';
import { logger } from '../utils/logger';
import { TYPES } from '../di/types';
import { EventSourceDao } from '../api/eventsources/eventsource.dao';
import { CommonEvent } from './transformers.model';

@injectable()
export class DDBStreamTransformer  {

    constructor(
        @inject(TYPES.EventSourceDao) private eventSourceDao: EventSourceDao) {}

    public async transform(event: any) {
        logger.debug(`ddbstream.transformer transform: in: event:${JSON.stringify(event)}`);

        // TODO: performance improvement, move to class level, but then how do we reset if it changes?
        const principalAttributes:{[key: string]: string} = {};

        const transformedEvents:CommonEvent[]=[];

        for(const rec of event['Records']) {

            /**
             *   identify the principal of the incoming event source
             */

            const eventSourceId = rec['eventSourceARN'];
            let principalAttribute=principalAttributes[eventSourceId];
            if (principalAttribute===undefined) {
                const r = await this.eventSourceDao.get(eventSourceId);
                if (r===undefined) {
                    logger.warn(`eventSource ${eventSourceId} not configured therefore ignoring`);
                    continue;
                }
                principalAttributes[eventSourceId]=r.principal;
                principalAttribute=principalAttributes[eventSourceId];
            }

            if (rec['dynamodb']===undefined || rec['dynamodb']['Keys']===undefined) {
                logger.warn(`eventSource ${eventSourceId} missing 'Keys' therefore ignoring: ${rec}`);
                continue;
            }

            /**
             *   find the principal in the incoming event
             */

            let principal:string;
            const keys=rec['dynamodb']['Keys'];
            const newImage=rec['dynamodb']['NewImage'];

            if (keys[principalAttribute]!==undefined) {
                principal=keys[principalAttribute][0];
            }

            if (principal===undefined && newImage[principalAttribute]!==undefined) {
                principal=newImage[principalAttribute][0];
            }

            if (principal===undefined) {
                logger.warn(`eventSource ${eventSourceId} missing value for principal therefore ignoring: ${rec}`);
                continue;
            }

            /**
             *   transform the rest of the attributes
             */

            const transformedEvent:CommonEvent = {
                principal,
                attributes:{}
            };

            Object.keys(keys).forEach(key=> {
                if (key!==principalAttribute) {
                    transformedEvent.attributes[key] = keys[key][0];
                }
            });
            transformedEvents.push();
        }

        logger.debug(`ddbstream.transformer transform: exit:`);
    }

}
