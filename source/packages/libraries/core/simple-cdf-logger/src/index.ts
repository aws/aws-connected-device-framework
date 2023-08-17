import { format } from 'logform';
import { LoggerOptions, createLogger, transports } from 'winston';
const { combine, timestamp, printf } = format;

const CONTEXT_KEY = 'context';
const AWS_REQUEST_ID_KEY = 'awsRequestId';

// allow overriding of the log level, or default to env var (createLogger defaults to INFO if none set)
export let level = process.env.LOGGING_LEVEL;
export function setLevel(newLevel: string) {
    level = newLevel;
}

// set the id for tracking the associated request
export let requestId = '';
export function setRequestId(newRequestId: string) {
    if (newRequestId) {
        requestId = newRequestId;
    }
}

export const logger = createLogger(<LoggerOptions>{
    level,
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

export function getRequestIdFromContext(context: any) {
    let requestId;
    if (context[AWS_REQUEST_ID_KEY]) {
        requestId = context[AWS_REQUEST_ID_KEY];
    }
    return requestId;
}

export function getRequestIdFromRequest(req: any) {
    let requestId;
    if (req[CONTEXT_KEY]) {
        requestId = getRequestIdFromContext(req[CONTEXT_KEY]);
    }
    return requestId;
}
