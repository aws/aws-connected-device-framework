import { injectable } from 'inversify';
import {DeviceContext} from './device.context';

/**
 * Represents a state within the state machine. All states must extend this base state.
 */
@injectable()
export abstract class DeviceState {

    /**
     * A reference to the _context_ object of the finite state machine.
     */
    public context: DeviceContext<unknown,unknown,unknown,unknown>;

    /**
     * Processes the state.
     */
    public abstract process(): Promise<void>;

}
