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
