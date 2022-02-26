import {DeploymentItem} from './deployment.model';

export class DeploymentTaskResource {
    taskId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deployments?: DeploymentItem[]
}

export class DeploymentTaskItem {
    taskId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    deployments?: DeploymentItem[]
}

export class DeploymentTaskList {
    deploymentTasks: DeploymentTaskItem[] = [];
    pagination?: {
        lastEvaluated?: {
            taskId: string
        }
        count: number;
    };
}
