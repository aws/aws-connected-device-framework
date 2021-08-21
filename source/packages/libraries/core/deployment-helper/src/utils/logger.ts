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
import {createLogger, LoggerOptions, transports} from 'winston';
import {format} from 'logform';
const { combine, timestamp, printf } = format;
import config from 'config';

export const logger = createLogger(<LoggerOptions> {
    level: config.get('logging.level'),
    exitOnError: false,
    transports: [
        new transports.Console(),
    ],
    format: combine(
      timestamp(),
      printf(nfo => {
        return `${nfo.timestamp} ${nfo.level}: ${nfo.message}`;
      })
    ),
});
