import {
    ActivationResponse
} from './activation.model';
import {PathHelper} from '../utils/path.helper';
import {injectable} from 'inversify';
import {ClientServiceBase} from './common.service';
import { RequestHeaders } from './common.model';

export interface ActivationService {

    createActivation(deviceId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse>;

    getActivation(activationId: string, additionalHeaders?:RequestHeaders): Promise<ActivationResponse>;

    deleteActivation(activationId: string, additionalHeaders?:RequestHeaders): Promise<void>;

}

@injectable()
export class ActivationServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected activationsRelativeUrl(): string {
        return PathHelper.encodeUrl('activations')
    }

    protected activationsByIdRelativeUrl(activationId: string): string {
        return PathHelper.encodeUrl('activations', activationId)
    }

}
