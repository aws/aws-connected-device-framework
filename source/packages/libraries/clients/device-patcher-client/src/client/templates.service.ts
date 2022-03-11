import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { DeploymentTemplate, DeploymentTemplateList } from './templates.model';

export interface TemplatesService {

    saveTemplate(template: DeploymentTemplate, additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplate>;

    getTemplate(name: string, additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplate>;

    listTemplates(additionalHeaders?:RequestHeaders) : Promise<DeploymentTemplateList>;

    deleteTemplate(name: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class TemplatesServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected templatesRelativeUrl() : string {
        return '/deploymentTemplates';
    }

    protected templateRelativeUrl(id:string) : string {
        return PathHelper.encodeUrl('deploymentTemplates', id);
    }
}
