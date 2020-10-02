/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {injectable} from 'inversify';
import config from 'config';
import ow from 'ow';
import * as request from 'superagent';
import {RequestHeaders} from './common.model';
import { TargetsServiceBase, TargetsService } from './targets.service';
import { TargetResource } from './targets.model';
import { logger } from '../utils/logger';

@injectable()
export class TargetsApigwService extends TargetsServiceBase implements TargetsService {

    private readonly baseUrl:string;

    public constructor() {
        super();
        this.baseUrl = config.get('notifications.baseUrl') as string;
    }

    async createTarget(subscriptionId: string, targetType:string, target: TargetResource, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(target, ow.object.nonEmpty);

        const url = `${this.baseUrl}${super.targetsRelativeUrl(subscriptionId, targetType)}`;
        await request.post(url)
            .set(this.buildHeaders(additionalHeaders))
            .send(target);
    }

    async deleteTarget(subscriptionId: string, targetType:string, targetId:string, additionalHeaders?: RequestHeaders): Promise<void> {
        ow(subscriptionId, ow.string.nonEmpty);
        ow(targetType, ow.string.nonEmpty);
        ow(targetId, ow.string.nonEmpty);

        const url = `${this.baseUrl}${super.targetRelativeUrl(subscriptionId, targetType, targetId)}`;
        logger.debug(`>>>>> url: ${url}`);
        await request.delete(url)
            .set(this.buildHeaders(additionalHeaders));
    }

}
