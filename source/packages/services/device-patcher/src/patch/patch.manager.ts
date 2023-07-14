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

import { TYPES } from '../di/types';

import { PatchItem, PatchType } from './patch.model';

import { AgentbasedPatchService } from './agentbased-patch.service';

@injectable()
export class PatchManager {
    private readonly patchStrategies = {};

    constructor(
        @inject(TYPES.AgentbasedPatchService)
        protected agentbasedPatchService: AgentbasedPatchService
    ) {
        this.patchStrategies[PatchType.AGENTBASED] = agentbasedPatchService;
    }

    public async create(patchType: string, patch: PatchItem): Promise<void> {
        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patchType, 'Patch Template Type', ow.string.nonEmpty);

        await this.patchStrategies[patchType].create(patch);
    }

    public async deploy(patchType: string, patch: PatchItem): Promise<void> {
        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patchType, 'Patch Template Type', ow.string.nonEmpty);

        await this.patchStrategies[patchType].deploy(patch);
    }

    public async delete(patchType: string, patch: PatchItem): Promise<void> {
        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patchType, 'Patch Template Type', ow.string.nonEmpty);

        await this.patchStrategies[patchType].delete(patch);
    }

    public async update(patchType: string, patch: PatchItem): Promise<void> {
        ow(patch, 'Patch Information', ow.object.nonEmpty);
        ow(patchType, 'Patch Template Type', ow.string.nonEmpty);

        await this.patchStrategies[patchType].update(patch);
    }
}
