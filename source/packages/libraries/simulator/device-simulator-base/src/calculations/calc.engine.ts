import { injectable } from 'inversify';
import ow from 'ow';
import { logger } from '../utils/logger';
import { Calculation } from './calculation';

/**
 * Manages all calculations defined for the simulator.
 * @type {D} the type of the class that contains all the data attributes being calculated.
 */
@injectable()
export class CalcEngine<D> {
    private CLASS_LOGGING_DATA = { class: 'CalcEngine' };

    private _calculations: Calculation<unknown, unknown>[];
    private _results: D;
    private pollerInterval: number;

    constructor() {
        this.pollerInterval = Number(process.env.CALCULATIONS_INTERVAL);
    }

    /**
     * Returns the latest calculated data.
     */
    get results(): D {
        return this._results;
    }

    private _pollerInterval: NodeJS.Timer;

    /**
     * Initialize the calculation engine. This method must be called once before starting the calculation engine.
     * @param initialState Initial starting data.
     * @param calculations An array of all calculations to perform on the data.
     */
    public initialize(initialState: D, calculations: Calculation<unknown, unknown>[]): void {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'initialize_data' };
        logger.verbose(`initialState: ${JSON.stringify(initialState)}`, {
            ...logMeta,
            type: 'in',
        });
        logger.verbose(`calculations: ${JSON.stringify(calculations)}`, {
            ...logMeta,
            type: 'in',
        });

        this._results = Object.assign({}, initialState);
        this._calculations = calculations;

        for (const calculation of this._calculations) {
            const newData = calculation.data;
            logger.debug(`setting _results[${calculation.name}] to ${newData}`, logMeta);
            this._results[calculation.name] = newData;
        }
    }

    /**
     * Starts the calculation engine. Ensure that `initialize` has been called first.
     */
    public start(): void {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'start' };
        logger.verbose('', { ...logMeta, type: 'in' });

        ow(this._calculations, ow.array.minLength(1));

        const _this = this; // eslint-disable-line
        this._pollerInterval = setInterval(() => {
            _this.calculate();
        }, _this.pollerInterval);
    }

    /**
     * Stops the calculation engine.
     */
    public stop(): void {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'stop' };
        logger.verbose('', { ...logMeta, type: 'in' });
        clearInterval(this._pollerInterval);
    }

    private calculate(): D {
        const logMeta = { ...this.CLASS_LOGGING_DATA, method: 'calculate' };
        logger.verbose('', { ...logMeta, type: 'in' });

        const updated: D = Object.assign({}, this._results);
        for (const calculation of this._calculations) {
            calculation.calculate(this._results);
            updated[calculation.name] = calculation.data;
        }

        this._results = updated;

        logger.debug(`results: ${JSON.stringify(this._results)}`, { ...logMeta, type: 'exit' });
        return this._results;
    }
}
