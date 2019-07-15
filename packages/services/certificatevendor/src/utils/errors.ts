/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { logger } from './logger';

export function handleError(e:Error): void {
    logger.error(`handleError: ${JSON.stringify(e)}`);

    // throwing an error out of the Lambda handler will cause Lambda to retry the event
    // if it doesn't make sense to retry, e.g. input validation,
    // then just return and do not throw the error

    if (e.name === 'NotFound' || e.message === 'CERTIFICATE_NOT_FOUND' ) {
        return;
    } else if (e.name === 'ResourceNotFound' || e.message === 'UNABLE_TO_ACTIVATE_CERTIFICATE' ) {
        return;
    } else if (e.name === 'ArgumentError') {
        return;
    } else {
        throw e;
    }
}
