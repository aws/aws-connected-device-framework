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
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { v1 as uuid } from 'uuid';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';

import { PatchDao } from './patch.dao';
import { PatchManager } from './patch.manager';
import { PatchItem, PatchStatus, PatchType } from './patch.model';

import { PatchListPaginationKey } from './patchTask.dao';

@injectable()
export class PatchService {
    constructor(
        @inject(TYPES.PatchDao) private patchDao: PatchDao,
        @inject(TYPES.PatchManager) private patchManager: PatchManager
    ) {}

    public validate(patches: PatchItem[]) {
        for (const patch of patches) {
            logger.debug(`PatchService.validate: in: patch: ${patch}`);
            ow(patch, 'Patch Information', ow.object.nonEmpty);
            ow(patch.patchId, 'Patch Id', ow.optional.string.nonEmpty);
            ow(patch.patchTemplateName, 'Patch Template Name', ow.optional.string.nonEmpty);
            ow(patch.patchStatus, 'Patch Status', ow.optional.string.nonEmpty);
            ow(patch.patchType, 'Patch Type', ow.optional.string.nonEmpty);
            ow(patch.deviceId, 'Patch Device Id', ow.optional.string.nonEmpty);
        }
    }

    public async createBulk(patches: PatchItem[]): Promise<void> {
        logger.debug(`PatchService.createPatch: in: patches: ${JSON.stringify(patches)}`);

        ow(patches, ow.array.nonEmpty);

        for (const patch of patches) {
            patch.patchId = uuid();
            patch.createdAt = new Date();
            patch.updatedAt = patch.createdAt;
            patch.patchStatus = PatchStatus.CREATED;

            if (!patch.patchType) {
                patch.patchType = PatchType.AGENTBASED;
            }

            try {
                await this.patchManager.create(patch.patchType, patch);
            } catch (err) {
                logger.error(`patch.service patchManager.create: err: ${err}`);

                patch.patchStatus = PatchStatus.FAILED;
                if (err.message) {
                    patch.statusMessage = err.message;
                } else if (err.code) {
                    patch.statusMessage = err.code;
                }
            }
        }

        await this.patchDao.saveBatches(patches);

        logger.debug(`PatchService.createPatch out: exit`);
    }

    public async deploy(patch: PatchItem): Promise<void> {
        logger.debug(`PatchService.deploy: in: patch: ${JSON.stringify(patch)}`);

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchTemplateName, ow.string.nonEmpty);
        ow(patch.patchType, ow.string.nonEmpty);

        try {
            await this.patchManager.deploy(patch.patchType, patch);
        } catch (err) {
            logger.error(`patch.service patchTemplatesDao.get: err: ${err}`);

            patch.patchStatus = PatchStatus.FAILED;
            if (err.message) {
                patch.statusMessage = err.message;
            } else if (err.code) {
                patch.statusMessage = err.code;
            }
        }

        await this.patchDao.update(patch);

        logger.debug(`PatchService.deploy exit:`);
    }

    public async get(patchId: string): Promise<PatchItem> {
        logger.debug(`PatchService get: in: patchId: ${patchId}`);

        ow(patchId, 'Patch Id', ow.string.nonEmpty);

        const patch = await this.patchDao.get(patchId);

        logger.debug(`patch.service getPatchByDeviceId: exit: patch: ${JSON.stringify(patch)}`);
        return patch;
    }

    public async listPatchesByDeviceId(
        deviceId: string,
        status?: string,
        count?: number,
        exclusiveStartKey?: PatchListPaginationKey
    ): Promise<[PatchItem[], PatchListPaginationKey]> {
        logger.debug(`PatchService listPatchesByDeviceId: in: deviceId: ${deviceId}`);

        ow(deviceId, 'Device Id', ow.string.nonEmpty);

        let patches;
        try {
            patches = await this.patchDao.list(deviceId, status, count, exclusiveStartKey);
        } catch (err) {
            logger.error(`patch.service patchDao.list: err: ${err}`);
            throw err;
        }

        logger.debug(
            `patch.service listPatchsByDeviceId: exit: patch: ${JSON.stringify(patches)}`
        );
        return patches;
    }

    public async delete(patchId: string): Promise<void> {
        logger.debug(`patch.service delete: in: patchId: ${patchId}`);

        ow(patchId, 'Patch Id', ow.string.nonEmpty);

        const patch = await this.get(patchId);

        if (!patch) {
            throw new Error('NOT_FOUND');
        }

        let result;
        if (patch.patchType) {
            try {
                result = await this.patchManager.delete(patch.patchType, patch);
            } catch (err) {
                logger.error(`patch.service patchManager.delete: err: ${err}`);
                throw err;
            }
        }

        await this.patchDao.delete(patchId);

        logger.debug(`patch.service delete out: result: ${JSON.stringify(result)}`);
    }

    public async update(patch: PatchItem): Promise<void> {
        logger.debug(`patch.service updateByDeviceId: in: patch: ${JSON.stringify(patch)}`);

        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch.deviceId, 'Device Id', ow.string.nonEmpty);

        const existingPatch = await this.get(patch.patchId);

        if (!existingPatch) {
            throw new Error('NOT_FOUND');
        }

        Object.assign(existingPatch, patch);

        try {
            await this.patchDao.update(existingPatch);
        } catch (err) {
            logger.error(`patch.service patchDao.update: err: ${err}`);
            throw err;
        }

        logger.debug(`patch.service updateByDeviceId: exit:`);
    }

    public async retry(patchId: string, patch: PatchItem): Promise<void> {
        logger.debug(`patch.service patch: in: patchId: ${JSON.stringify(patch)}`);

        ow(patchId, 'Patch Id', ow.string.nonEmpty);
        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patch.patchStatus, 'Patch Status', ow.string.nonEmpty);

        if (patch.patchStatus !== PatchStatus.RETRY) {
            throw new Error('UNSUPPORTED_PATCH_STATUS');
        }

        const existingPatch = await this.get(patchId);

        if (!existingPatch) {
            throw new Error('NOT_FOUND');
        }

        Object.assign(existingPatch, patch);

        let result;
        try {
            result = await this.patchManager.update(existingPatch.patchType, existingPatch);
        } catch (e) {
            logger.error(`patch.service patchManager.retry: err: ${e}`);
            patch.patchStatus = PatchStatus.FAILED;
            if (e.message) {
                patch.statusMessage = e.message;
            } else if (e.code) {
                patch.statusMessage = e.code;
            }
        }
        patch.statusMessage = '';
        await this.patchDao.update(existingPatch);

        logger.debug(`patch.service patch out: result: ${JSON.stringify(result)}`);
    }
}
