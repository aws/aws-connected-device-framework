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
import { Response } from 'express';
import { inject } from 'inversify';
import {
    controller,
    httpDelete,
    httpGet,
    httpPatch,
    interfaces,
    queryParam,
    requestBody,
    requestParam,
    response,
} from 'inversify-express-utils';

import { logger } from '@awssolutions/simple-cdf-logger';
import { handleError } from '../utils/errors';

import { TYPES } from '../di/types';
import { PatchAssembler } from './patch.assembler';
import { PatchResource } from './patch.model';
import { PatchService } from './patch.service';

@controller('')
export class PatchController implements interfaces.Controller {
    public constructor(
        @inject(TYPES.PatchService) private patchService: PatchService,
        @inject(TYPES.PatchAssembler) private patchAssembler: PatchAssembler,
    ) {}

    @httpGet('/patches/:patchId')
    public async getPatch(
        @response() res: Response,
        @requestParam('patchId') patchId: string,
    ): Promise<PatchResource> {
        logger.debug(`Patch.controller getPatch: in: patchId: ${patchId}`);

        let patchResource: PatchResource;

        try {
            patchResource = await this.patchService.get(patchId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Patch.controller getPatch: exit: ${JSON.stringify(patchResource)}`);

        return patchResource;
    }

    @httpGet('/devices/:deviceId/patches')
    public async listPatches(
        @response() res: Response,
        @requestParam('deviceId') deviceId: string,
        @queryParam('patchStatus') patchStatus: string,
        @queryParam('count') count: number,
        @queryParam('exclusiveStartToken') exclusiveStartToken: string,
    ): Promise<void> {
        logger.debug(`Patch.controller getPatch: in: deviceId: ${deviceId}`);

        try {
            const [items, paginationKey] = await this.patchService.listPatchesByDeviceId(
                deviceId,
                patchStatus,
                count,
                { nextToken: exclusiveStartToken },
            );
            const resources = this.patchAssembler.toListResource(items, count, paginationKey);
            logger.debug(`Patch.controller getPatch: exit: ${JSON.stringify(resources)}`);

            res.status(200).send(resources);
        } catch (err) {
            handleError(err, res);
        }
    }

    @httpDelete('/patches/:patchId')
    public async deletePatch(
        @requestParam('patchId') patchId: string,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(`Patch.controller deletePatch: in: patchId: ${patchId}`);

        try {
            await this.patchService.delete(patchId);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Patch.controller delete: exit:}`);
    }

    @httpPatch('/patches/:patchId')
    public async patchPatch(
        @requestParam('patchId') patchId: string,
        @requestBody() req: PatchResource,
        @response() res: Response,
    ): Promise<void> {
        logger.debug(`Patch.controller patchPatch: in: patchId: ${patchId}`);

        try {
            await this.patchService.retry(patchId, req);
        } catch (err) {
            handleError(err, res);
        }

        logger.debug(`Patch.controller patch: exit:}`);
    }
}
