/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
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
