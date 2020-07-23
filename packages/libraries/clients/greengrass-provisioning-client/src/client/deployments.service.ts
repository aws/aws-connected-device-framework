import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { Deployment, DeploymentTaskSummary } from './deployments.model';
import { RequestHeaders } from './common.model';

export interface DeploymentsService {

    createDeploymentTask(deployments:Deployment[], additionalHeaders?:RequestHeaders) : Promise<DeploymentTaskSummary>;

    getDeploymentTask(deploymentId:string, additionalHeaders?:RequestHeaders) : Promise<DeploymentTaskSummary>;

}

@injectable()
export class DeploymentsServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected deploymentsRelativeUrl() : string {
        return '/deploymentTasks';
    }

    protected deploymentsByIdRelativeUrl(taskId: string) : string {
        return PathHelper.encodeUrl('deploymentTasks', taskId);
    }

}
