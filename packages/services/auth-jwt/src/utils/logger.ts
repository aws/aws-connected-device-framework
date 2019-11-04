/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import {Logger, LoggerInstance, LoggerOptions, transports} from 'winston';

export const logger: LoggerInstance = new Logger(<LoggerOptions> {
    level: 'debug',
    exitOnError: false,
    transports: [
        new transports.Console({
            timestamp: true,
            showLevel: true,
        }),
    ],
});
