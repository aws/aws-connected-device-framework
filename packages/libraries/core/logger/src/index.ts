import {createLogger, Logger, LoggerOptions, transports} from 'winston';

/**
 * Class representing CDF Logging mechanism.
 * @type {CDFLogger}
 * @module CDFLogger
 */
export class CDFLogger {
    private readonly _internalLogger: Logger;

    /**
     * Construct new instance of logger
     * @param logLevel of the logger
     */
    constructor(logLevel?: string) {
        const defaultLoggingOptions: LoggerOptions = {
            level: logLevel ? logLevel : 'debug',
            exitOnError: false,
            transports: [
                new transports.Console()
            ]
        };
        this._internalLogger = createLogger(defaultLoggingOptions);
    }

    /**
     * Log at debug level
     * @param message to be logged
     * @param meta any other objects to be logged
     */
    public debug(message: string, ...meta: any[]): void {
        this._internalLogger.debug(message, meta);
    }

    /**
     * Log at info level
     * @param message to be logged
     * @param meta any other objects to be logged
     */
    public info(message: string, ...meta: any[]): void {
        this._internalLogger.info(message, meta);
    }

    /**
     * Log at warn level
     * @param message to be logged
     * @param meta any other objects to be logged
     */
    public warn(message: string, ...meta: any[]): void {
        this._internalLogger.warn(message, meta);
    }

    /**
     * Log at error level
     * @param message to be logged
     * @param meta any other objects to be logged
     */
    public error(message: string, ...meta: any[]): void {
        this._internalLogger.error(message, meta);
    }

}
