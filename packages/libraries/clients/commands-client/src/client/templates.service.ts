import {TemplateModel} from './templates.models';
import {RequestHeaders} from './commands.model';
import config from 'config';
import {PathHelper} from '../utils/path.helper';

export interface TemplatesService {
    createTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void>;

    getTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<TemplateModel>;

    listTemplates(additionalHeaders?: RequestHeaders): Promise<TemplateModel>;

    updateTemplate(template: TemplateModel, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteTemplate(templateId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

export class TemplatesServiceBase {

    protected MIME_TYPE: string = 'application/vnd.aws-cdf-v1.0+json';

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

    protected buildHeaders(additionalHeaders:RequestHeaders) {

        let headers = this._headers;

        if (config.has('commands.headers')) {
            const headersFromConfig:RequestHeaders = config.get('commands.headers') as RequestHeaders;
            if (headersFromConfig !== null && headersFromConfig !== undefined) {
                headers = {...headers, ...headersFromConfig};
            }
        }

        if (additionalHeaders !== null && additionalHeaders !== undefined) {
            headers = {...headers, ...additionalHeaders};
        }

        return headers;
    }

}