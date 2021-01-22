/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';

import ow from 'ow';
import { TYPES } from '../di/types';
import { RolloutsValidator } from '../rollouts/rollouts.validator';
import { TemplateModel } from './templates.models';

@injectable()
export class TemplatesValidator {

    constructor(
        @inject(TYPES.RolloutsValidator) private rolloutsValidator: RolloutsValidator) {
    }

    public validate(t:TemplateModel) : void {
        
        ow(t, ow.object.nonEmpty);
        ow(t.templateId, ow.string.nonEmpty);
        ow(t.operation, ow.string.nonEmpty);
        ow(t.document, ow.string.nonEmpty);
        
        this.rolloutsValidator.validate(t.jobExecutionsRolloutConfig, t.abortConfig, t.timeoutConfig);

    }

}
