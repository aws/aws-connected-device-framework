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
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpGet,
    interfaces,
    queryParam,
    requestParam,
    response,
} from 'inversify-express-utils';
import { TYPES } from '../di/types';
import { ListCategoryEventsArgs, ListObjectEventsArgs, SortDirection } from '../events/events.dao';
import { StateHistoryListModel } from '../events/events.models';
import { handleError } from '../utils/errors';
import { QueryService } from './queries.service';

@controller('')
export class QueryController implements interfaces.Controller {
    constructor(@inject(TYPES.QueryService) private queryService: QueryService) {}

    @httpGet('/:category')
    public async listCategoryEvents(
        @response() res: Response,
        @requestParam('category') category: string,
        @queryParam('timeFrom') timeFrom: string,
        @queryParam('timeTo') timeTo: string,
        @queryParam('user') user: string,
        @queryParam('event') event: string,
        @queryParam('sort') sort: SortDirection,
        @queryParam('token') token: string,
        @queryParam('limit') limit: number,
    ): Promise<StateHistoryListModel> {
        logger.info(
            `queries.controller listCategoryEvents: in: category:${category}, timeFrom:${timeFrom}, timeTo:${timeTo}, user:${user}, event:${event}, category:${category}, sort:${sort}, token:${token}, limit:${limit}`,
        );
        try {
            const params: ListCategoryEventsArgs = {
                category,
                timeFrom,
                timeTo,
                user,
                event,
                token,
                sort,
                limit,
            };
            const model = await this.queryService.listCategoryEvents(params);
            logger.debug(`queries.controller exit: ${JSON.stringify(model)}`);

            if (model === undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('/:category/:objectId')
    public async listObjectEvents(
        @response() res: Response,
        @requestParam('category') category: string,
        @requestParam('objectId') objectId: string,
        @queryParam('timeAt') timeAt: string,
        @queryParam('timeFrom') timeFrom: string,
        @queryParam('timeTo') timeTo: string,
        @queryParam('user') user: string,
        @queryParam('event') event: string,
        @queryParam('sort') sort: SortDirection,
        @queryParam('token') token: string,
        @queryParam('limit') limit: number,
    ): Promise<StateHistoryListModel> {
        logger.info(
            `queries.controller listObjectEvents: in: category:${category}, objectId:${objectId}, timeAt:${timeAt}, timeFrom:${timeFrom}, timeTo:${timeTo}, user:${user}, event:${event}, category:${category}, sort:${sort}, token:${token}, limit:${limit}`,
        );
        try {
            const params: ListObjectEventsArgs = {
                category,
                objectId,
                timeAt,
                timeFrom,
                timeTo,
                user,
                event,
                token,
                sort,
                limit,
            };
            const model = await this.queryService.listObjectEvents(params);
            logger.debug(`queries.controller exit: ${JSON.stringify(model)}`);

            if (model === undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }
}
