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
