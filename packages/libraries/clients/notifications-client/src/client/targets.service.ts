import {RequestHeaders} from './common.model';
import {injectable} from 'inversify';
import {CommonServiceBase} from './common.service';
import {TargetResource} from './targets.model';
import { PathHelper } from '../utils/path.helper';

export interface TargetsService {
    createTarget(subscriptionId: string, targetType:string, target: TargetResource, additionalHeaders?: RequestHeaders): Promise<void>;

    deleteTarget(subscriptionId: string, targetType:string, targetId:string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class TargetsServiceBase extends CommonServiceBase  {

    protected targetsRelativeUrl(subscriptionId: string, targetType:string): string {
        return `/subscriptions/${subscriptionId}/targets/${targetType}`;
    }

    protected targetRelativeUrl(subscriptionId: string, targetType:string, targetId:string): string {
        return `/${PathHelper.encodeUrl('subscriptions', subscriptionId, 'targets', targetType, targetId)}`;
    }
}
