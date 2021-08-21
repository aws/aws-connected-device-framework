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
import { injectable, inject } from 'inversify';

import { TYPES } from '../di/types';

import { S3Loader } from './loaders/s3.loader';
import { Transformed } from './transform.service';

@injectable()
export class LoadService {

    private readonly loaders: Loaders = {};

    constructor(
        @inject(TYPES.S3Loader) protected s3Loader: S3Loader,
        @inject('defaults.etl.load.type') private loadType: string
    ) {
        this.loaders['S3'] = s3Loader;
    }

    public async load(batch: Transformed): Promise<Loaded> {
        return await this.loaders[this.loadType].load(batch);
    }
}

export interface Loader {
    load(batch: Transformed): Promise<Loaded>;
}

export interface Loaders {
    [key: string]: Loader;
}

export interface Loaded {
    [key: string]: unknown;
}
