/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {Logger, transports, createLogger} from 'winston';

export const logger: Logger = createLogger( {
    level: 'debug',
    exitOnError: false,
    transports: [
        new transports.Console()
    ],
});
