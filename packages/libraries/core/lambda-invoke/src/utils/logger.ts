/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {createLogger, LoggerOptions, transports} from 'winston';
import {format} from 'logform';
import config from 'config';
const { combine, timestamp, printf } = format;

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
