import { createLogger, LoggerOptions, transports } from 'winston';
import { format } from 'logform';
const { combine, timestamp, printf } = format;

export let requestId = '';
export function setRequestId(newRequestId: string) {
    requestId = newRequestId;
}
export const logger = createLogger(<LoggerOptions>{
    level: process.env.LOGGING_LEVEL,
    exitOnError: false,
    transports: [new transports.Console()],
    format: combine(
        timestamp(),
        printf((nfo) => {
            return `${nfo.timestamp} ${nfo.level}: rid-${requestId ? requestId : 'not-set-yet'}: ${
                nfo.message
            }`;
        })
    ),
});
