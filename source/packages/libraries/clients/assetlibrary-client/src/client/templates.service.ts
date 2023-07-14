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
import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';
import { CategoryEnum, StatusEnum, TypeResource, TypeResourceList } from './templates.model';

export interface TemplatesService {
    getTemplate(
        category: CategoryEnum,
        templateId: string,
        status: StatusEnum,
        additionalHeaders?: RequestHeaders,
    ): Promise<TypeResource>;

    createTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void>;

    updateTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void>;

    publishTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    deleteTemplate(
        category: CategoryEnum,
        templateId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<void>;

    listTemplates(
        category: CategoryEnum,
        status?: string,
        offset?: number,
        count?: number,
        additionalHeaders?: RequestHeaders,
    ): Promise<TypeResourceList>;
}

@injectable()
export class TemplatesServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected templateRelativeUrl(category: CategoryEnum, templateId: string): string {
        return PathHelper.encodeUrl('templates', category, templateId);
    }

    protected publishTemplateRelativeUrl(category: CategoryEnum, templateId: string): string {
        return PathHelper.encodeUrl('templates', category, templateId, 'publish');
    }

    protected templatesRelativeUrl(category: CategoryEnum): string {
        return PathHelper.encodeUrl('templates', category);
    }
}
