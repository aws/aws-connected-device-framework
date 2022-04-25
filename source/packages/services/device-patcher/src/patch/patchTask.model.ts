import {PatchItem} from './patch.model';

export class PatchTaskResource {
    taskId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    patches?: PatchItem[]
}

export class PatchTaskItem {
    taskId?: string;
    createdAt?: Date;
    updatedAt?: Date;
    patches?: PatchItem[]
}

export class PatchTaskList {
    patchTasks: PatchTaskItem[] = [];
    pagination?: {
        lastEvaluated?: {
            taskId: string
        }
        count: number;
    };
}
