/**
 * All interface that all calculation classes must adhere to.
 * @type {D} the type of the calculation result. May be a simple primitive such as a number, or a more complex object handling multiple values.
 * @type {T} the type of the class that contains all the data attributes being tracked across the entire calculation engine.
 */
export interface Calculation<D,T> {

    /**
     * Performs the calculation.
     * @param data The attributes being simulated.
     */
    calculate(data:T):void;

    /**
     * Returns the attributes being simulated.
     */
    data:D;

    /**
     * The name of the attribute being calculated. This is used to reference the value in the telemetry message templates.
     */
    name:string;
}
