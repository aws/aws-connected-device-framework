import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { CreatePatchTemplateParams, UpdatePatchTemplateParams, PatchTemplate, PatchTemplateList } from './templates.model';

export interface TemplatesService {

    createTemplate(template: CreatePatchTemplateParams, additionalHeaders?:RequestHeaders) : Promise<void>;

    updateTemplate(template: UpdatePatchTemplateParams, additionalHeaders?:RequestHeaders) : Promise<void>;

    getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<PatchTemplate>;

    listTemplates(additionalHeaders?:RequestHeaders) : Promise<PatchTemplateList>;

    deleteTemplate(name: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class TemplatesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected templatesRelativeUrl() : string {
        return '/patchTemplates';
    }

    protected templateRelativeUrl(id:string) : string {
        return PathHelper.encodeUrl('patchTemplates', id);
    }
}
