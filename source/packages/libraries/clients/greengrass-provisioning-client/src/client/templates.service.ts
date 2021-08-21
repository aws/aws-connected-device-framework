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
import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';import { Template, TemplateList } from './templates.model';

export interface TemplatesService {

    saveTemplate(template: Template, additionalHeaders?:RequestHeaders) : Promise<Template>;

    getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<Template>;

    deleteTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<void>;

    listTemplates(additionalHeaders?:RequestHeaders) : Promise<TemplateList>;

}

@injectable()
export class TemplatesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected templatesRelativeUrl() : string {
        return '/templates';
    }

    protected templateRelativeUrl(id:string) : string {
        return PathHelper.encodeUrl('templates', id);
    }
}
