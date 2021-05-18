import {
    ActivationResponse
} from './activation.model';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';
import {ClientServiceBase} from './common.service';
import { RequestHeaders } from './common.model';

export interface ActivationService {

    createActivation(deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse>;

    getActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse>;

    deleteActivation(activationId: string, deviceId: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class ActivationServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected activationsRelativeUrl(deviceId: string): string {
        return PathHelper.encodeUrl('devices', deviceId, 'activations')
    }

    protected activationsByIdRelativeUrl(activationId: string, deviceId: string, ): string {
        return PathHelper.encodeUrl('devices', deviceId, 'activations', activationId)
    }

}
