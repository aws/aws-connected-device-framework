import {injectable} from 'inversify';
import { RequestHeaders } from './common.model';
import {CommonServiceBase} from './common.service';
import { SimulateIoTCoreMessageRequest } from './messages.model';

export interface MessagesDebugService {
    simulateIoTCoreMessage(message:SimulateIoTCoreMessageRequest, additionalHeaders?: RequestHeaders
        ): Promise<void>;
}

@injectable()
export class MessagesDebugServiceBase extends CommonServiceBase  {

    protected iotcoreRelativeUrl(): string {
        return `/messages/iotcore`;
    }
}
