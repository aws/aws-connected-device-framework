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
import { RequestHeaders } from './commands.model';
import { TemplateModel } from './templates.models';

export interface TemplatesService {
    createTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void>;

    getTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<TemplateModel>;

    listTemplates(additionalHeaders?: RequestHeaders): Promise<TemplateModel>;

    updateTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class TemplatesServiceBase {

    protected MIME_TYPE = 'application/vnd.aws-cdf-v1.0+json';

    protected _headers: RequestHeaders = {
        'Accept': this.MIME_TYPE,
        'Content-Type': this.MIME_TYPE
    };

    protected templatesRelativeUrl() : string {
        return '/templates';
    }

    protected templateRelativeUrl(templateId: string) : string {
        return PathHelper.encodeUrl('templates', templateId);
    }

    protected buildHeaders(additionalHeaders:RequestHeaders) : RequestHeaders {

        let headers: RequestHeaders = Object.assign({}, this._headers);

        const customHeaders = process.env.COMMANDS_HEADERS;
        if (customHeaders !== undefined) {
            try {
                const headersFromConfig: RequestHeaders = JSON.parse(customHeaders) as unknown as RequestHeaders;
                headers = {...headers, ...headersFromConfig};
            } catch (err) { 
                const wrappedErr = `Failed to parse configuration parameter COMMANDS_HEADERS as JSON with error: ${err}`;
                console.log(wrappedErr);
                throw new Error(wrappedErr);
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = {...headers, ...additionalHeaders};
        }

        const keys = Object.keys(headers);
        keys.forEach(k=> {
            if (headers[k]===undefined || headers[k]===null) {
                delete headers[k];
            }
        });

        return headers;
    }

}
