/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Response } from 'express';
import { interfaces, controller, response, httpGet, queryParam, requestParam} from 'inversify-express-utils';
import { inject } from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {handleError} from '../utils/errors';
import { QueryService } from './queries.service';
import { StateHistoryListModel } from '../events/events.models';
import { ListCategoryEventsArgs, ListObjectEventsArgs, SortDirection } from '../events/events.dao';

@controller('')
export class QueryController implements interfaces.Controller {

    constructor( @inject(TYPES.QueryService) private queryService: QueryService) {}

    @httpGet('/:category')
    public async listCategoryEvents(@response() res:Response, @requestParam('category') category:string,
        @queryParam('timeFrom') timeFrom:string, @queryParam('timeTo') timeTo:string,
        @queryParam('user') user:string, @queryParam('event') event:string,
        @queryParam('sort') sort:SortDirection,
        @queryParam('token') token:string,  @queryParam('limit') limit:number): Promise<StateHistoryListModel> {

        logger.info(`queries.controller listCategoryEvents: in: category:${category}, timeFrom:${timeFrom}, timeTo:${timeTo}, user:${user}, event:${event}, category:${category}, sort:${sort}, token:${token}, limit:${limit}`);
        try {
            const params:ListCategoryEventsArgs= { category, timeFrom, timeTo, user, event, token, sort, limit };
            const model = await this.queryService.listCategoryEvents(params);
            logger.debug(`queries.controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

    @httpGet('/:category/:objectId')
    public async listObjectEvents(@response() res:Response, @requestParam('category') category:string, @requestParam('objectId') objectId:string,
        @queryParam('timeAt') timeAt:string, @queryParam('timeFrom') timeFrom:string, @queryParam('timeTo') timeTo:string,
        @queryParam('user') user:string, @queryParam('event') event:string,
        @queryParam('sort') sort:SortDirection,
        @queryParam('token') token:string,  @queryParam('limit') limit:number): Promise<StateHistoryListModel> {

        logger.info(`queries.controller listObjectEvents: in: category:${category}, objectId:${objectId}, timeAt:${timeAt}, timeFrom:${timeFrom}, timeTo:${timeTo}, user:${user}, event:${event}, category:${category}, sort:${sort}, token:${token}, limit:${limit}`);
        try {
            const params:ListObjectEventsArgs= { category, objectId, timeAt, timeFrom, timeTo, user, event, token, sort, limit };
            const model = await this.queryService.listObjectEvents(params);
            logger.debug(`queries.controller exit: ${JSON.stringify(model)}`);

            if (model===undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e,res);
        }
        return null;
    }

}
