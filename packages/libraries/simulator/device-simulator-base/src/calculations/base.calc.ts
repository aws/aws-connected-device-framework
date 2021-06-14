import dayjs, {Dayjs } from 'dayjs';
import duration, { Duration } from 'dayjs/plugin/duration'
import { injectable, unmanaged } from 'inversify';
import { logger } from '../utils/logger';
import { Calculation } from './calculation';

dayjs.extend(duration);

/**
 * Base class for all calculations.
 * @type {D} the type of the calculation result. May be a simple primitive such as a number, or a more complex object handling multiple values.
 * @type {T} the type of the class that contains all the data attributes being tracked across the entire calculation engine.
 */
@injectable()
export abstract class BaseCalc<D,T> implements Calculation<D,T> {

    protected CLASS_LOGGING_DATA = {class: 'Calculation'};

    public lastCalc:Dayjs;

    /**
     * @constructor
     * @param name the name of the result stored as data. This name is how the value will be referenced within the telemetry message templates.
     * @param _data the initial value of the data managed by this calculation.
     */
    protected constructor(@unmanaged() public readonly name:string, @unmanaged() private _data:D) {
    }

    /**
     * Returns the current value of the result managed by this calculation.
     */
    get data():D { return this._data}
    /**
     * Updates the current value of the result managed by this calculation. 
     */
    set data(updated:D) {
        const logMeta = {...this.CLASS_LOGGING_DATA,  method: 'iterate'};
        logger.verbose(`updated:${JSON.stringify(updated)}`, {...logMeta, type: 'in'} );
        this._data = updated;
        this.updateLastCalcTime();
    }

    /**
     * Updates the last calculation time so that the time delta can be determined between calculations. This is called as part of updating the calculations data, but if
     * a particular calculation run was to generate no value, this method should still be called manually instead.
     */
    protected updateLastCalcTime(): void {
        this.lastCalc = new Dayjs();
    }

    /**
     * All calculations must implement the `calculate` method which is responsible for determining and updating the value managed by this calculation.
     * @param data The current data attributes across all calculations. 
     */
    public abstract calculate(data:T):void;

    /**
     * 
     * @returns Returns the time since the last calculation.
     */
    protected getTimeDelta() : Duration {
        if (this.lastCalc===undefined) {
            return dayjs.duration(0);
        } else {
            return dayjs.duration( (new Dayjs()).diff(this.lastCalc));
        }
    }

}

