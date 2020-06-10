import {CategoryEnum, StatusEnum, TypeResource, TypeResourceList} from './templates.model';
import {RequestHeaders} from './common.model';
import {ClientServiceBase} from './common.service';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';

export interface TemplatesService {
    getTemplate(category: CategoryEnum, templateId: string, status: StatusEnum, additionalHeaders?: RequestHeaders): Promise<TypeResource>;

    createTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void>;

    updateTemplate(resource: TypeResource, additionalHeaders?: RequestHeaders): Promise<void>;

    publishTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteTemplate(category: CategoryEnum, templateId: string, additionalHeaders?: RequestHeaders): Promise<void>;

    listTemplates(category: CategoryEnum, status?: string, offset?: number, count?: number, additionalHeaders?: RequestHeaders): Promise<TypeResourceList>;
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
