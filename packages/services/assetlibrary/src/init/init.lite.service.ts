/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable } from 'inversify';
import { InitService } from './init.service';

@injectable()
export class InitServiceLite implements InitService {

    public async init(): Promise<void> {
        throw new Error('NOT_SUPPORTED');
    }

}
