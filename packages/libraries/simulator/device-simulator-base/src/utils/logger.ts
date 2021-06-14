/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import {createLogger, LoggerOptions, transports} from 'winston';
import {format} from 'logform';
import config from 'config';

const jsonWithColorsAndTime = format.combine(
    format.colorize({all:true}),
    format.timestamp(),
    format.label(),
    format.metadata(),

    // json format will urlencode the color codes...
    // format.json(),

    // so instead, a hack to write out what looks like json, but us in fact still a string that includes the correct color codes:
    format.printf(info => {
        if (info.metadata.type) {
            return `{"ts":"${info.metadata.timestamp}", "level":"${info.level}", "class":"${info.metadata.class}", "method":"${info.metadata.method}", "type":"${info.metadata.type}", "message":"${info.message}"}`;
        } else {
            return `{"ts":"${info.metadata.timestamp}", "level":"${info.level}", "class":"${info.metadata.class}", "method":"${info.metadata.method}", "message":"${info.message}"}`;
        }
    }),

);

export const logger = createLogger(<LoggerOptions> {
    level: config.get('logging.level'),
    exitOnError: false,
    transports: [
        new transports.Console(),
    ],
    format: jsonWithColorsAndTime
});
