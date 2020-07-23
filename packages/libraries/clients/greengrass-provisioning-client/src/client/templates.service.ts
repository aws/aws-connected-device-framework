import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';import { Template, TemplateList } from './templates.model';

export interface TemplatesService {

    saveTemplate(template: Template, additionalHeaders?:RequestHeaders) : Promise<Template>;

    getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<Template>;

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
