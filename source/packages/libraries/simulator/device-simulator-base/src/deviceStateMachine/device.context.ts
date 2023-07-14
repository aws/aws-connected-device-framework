import { EventEmitter } from 'events';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { CalcEngine } from '../calculations/calc.engine';
import { DEVICE_SIMULATOR_TYPES } from '../di/types';
import { AwsIotThing } from '../iot/awsIotThing';
import { logger } from '../utils/logger';
import { DeviceState } from './device.state';

/**
 * Represents the `Context` of a finite state machine (see https://refactoring.guru/design-patterns/state for a description of this pattern).
 * @type {D} the type of the class that contains all the data attributes being tracked across the entire calculation engine.
 * @type {S} the type used to represent the _desired_ portion of a device shadow.
 * @type {T} the type used to represent the _reported_ portion of a device shadow.
 * @type {U} the type used to represent the _delta_ portion of a device shadow.
 */
@injectable()
export class DeviceContext<D, S, T, U> {
    private readonly CLASS_LOGGING_DATA = { class: 'DeviceContext' };

    private _state: DeviceState;
    public awsIotClient: AwsIotThing<S, T, U>;

    /**
     * @constructor
     * @param deviceEmitter
     * @param calculations
     */
    constructor(
        @inject(DEVICE_SIMULATOR_TYPES.DeviceEmitter) public readonly deviceEmitter: EventEmitter,
        @inject(DEVICE_SIMULATOR_TYPES.CalcEngine) public readonly calculations: CalcEngine<D>
    ) {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'constructor' };
        logger.verbose('', { ...logMeta, type: 'in' });
    }

    /**
     * Returns the current state of the state machine.
     */
    get state(): DeviceState {
        return this._state;
    }

    /**
     * Sets the current state of the state machine. Use to set te
     */
    set state(value: DeviceState) {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'state' };
        logger.info(`Device:: ${this._state?.constructor?.name} >>> ${value?.constructor?.name}`, {
            ...logMeta,
            type: 'in',
        });

        this._state = value;
        this._state.context = this;

        // emit the state we have transitioned to for other state machines to subscribe to
        this.deviceEmitter.emit(this._state.constructor.name);
    }

    /**
     * Transitions the state machine to the new provided state.
     * @param nextState The state to transition to.
     */
    public async transition(nextState: DeviceState): Promise<void> {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'transition' };
        logger.verbose('', { ...logMeta, type: 'in' });

        ow(nextState, ow.object.nonEmpty);

        if (nextState.constructor.name !== this._state?.constructor?.name) {
            this.state = nextState;
            await this.process();
            logger.verbose(`${nextState.constructor.name} exit`, { ...logMeta, type: 'exit' });
        }
        logger.verbose('', { ...logMeta, type: 'exit' });
    }

    /**
     * Processes the current state.
     */
    public async process(): Promise<void> {
        await this._state.process();
    }

    /**
     * Allows for subscribing to specific states to execute callbacks. This is useful for where the device state machine
     * acts as a nested state machine of another state machine, such as a seperate parent state machine managing the lifecycle
     * of a vehicle which at ignition on then starts the device state machine.
     * @param state The state to subscribe to.
     * @param callback The callback to execute.
     * @param other The other `this` object to bind the callback to.
     */
    public onTransition(state: string, callback: (state: unknown) => void, other: unknown): void {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'onTransition' };
        logger.verbose(`state:${state}`, { ...logMeta, type: 'in' });

        ow(state, ow.string.nonEmpty);
        ow(callback, ow.object.nonEmpty);

        this.deviceEmitter.on(state, callback.bind(other));
    }
}
