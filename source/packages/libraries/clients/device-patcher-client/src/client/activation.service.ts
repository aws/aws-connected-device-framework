import { injectable } from 'inversify';
import { PathHelper } from '../utils/path.helper';
import { ActivationResponse } from './activation.model';
import { RequestHeaders } from './common.model';
import { ClientServiceBase } from './common.service';

export interface ActivationService {
    createActivation(
        deviceId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<ActivationResponse>;

    getActivation(
        activationId: string,
        additionalHeaders?: RequestHeaders,
    ): Promise<ActivationResponse>;

    deleteActivation(activationId: string, additionalHeaders?: RequestHeaders): Promise<void>;
}

@injectable()
export class ActivationServiceBase extends ClientServiceBase {
    constructor() {
        super();
    }

    protected activationsRelativeUrl(): string {
        return PathHelper.encodeUrl('activations');
    }

    protected activationsByIdRelativeUrl(activationId: string): string {
        return PathHelper.encodeUrl('activations', activationId);
    }
}
