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

import { format } from 'logform';
import { createLogger, LoggerOptions, transports } from 'winston';

const jsonWithColorsAndTime = format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.label(),
    format.metadata(),

    // json format will urlencode the color codes...
    // format.json(),

    // so instead, a hack to write out what looks like json, but us in fact still a string that includes the correct color codes:
    format.printf((info) => {
        if (info.metadata.type) {
            return `{"ts":"${info.metadata.timestamp}", "level":"${info.level}", "class":"${info.metadata.class}", "method":"${info.metadata.method}", "type":"${info.metadata.type}", "message":"${info.message}"}`;
        } else {
            return `{"ts":"${info.metadata.timestamp}", "level":"${info.level}", "class":"${info.metadata.class}", "method":"${info.metadata.method}", "message":"${info.message}"}`;
        }
    }),
);

export const logger = createLogger(<LoggerOptions>{
    level: process.env.LOGGING_LEVEL,
    exitOnError: false,
    transports: [new transports.Console()],
    format: jsonWithColorsAndTime,
});
