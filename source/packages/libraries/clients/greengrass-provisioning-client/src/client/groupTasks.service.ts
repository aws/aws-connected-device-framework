import {PathHelper} from '../utils/path.helper';
import {ClientServiceBase} from './common.service';
import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import { GroupTaskItem, GroupTaskSummary } from './groupTasks.model';

export interface GroupTasksService {

    createGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary>;

    updateGroupTask(groups:GroupTaskItem[], additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary>;

    getGroupTask(taskId:string, additionalHeaders?:RequestHeaders) : Promise<GroupTaskSummary>;

}

@injectable()
export class GroupTasksServiceBase extends ClientServiceBase {

    constructor() {
        super();
    }

    protected groupTasksRelativeUrl() : string {
        return '/groupTasks';
    }

    protected groupTaskRelativeUrl(taskId:string) : string {
        return PathHelper.encodeUrl('groupTasks', taskId);
    }

}
