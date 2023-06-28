/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';

exports.handler = async (event: IotRuleJobEvent | IotRuleJobExecutionEvent, _context: unknown) : Promise<void> => {
  logger.debug(`lambda_job_command_response_handler: event: ${JSON.stringify(event)}`);

  // validate reply
  ow(event, ow.object.nonEmpty);
  ow(event.eventType, ow.string.nonEmpty);
  ow(event.operation, ow.string.nonEmpty);

  if (event.eventType==='JOB') {
    if (event.operation==='completed' || event.operation==='canceled' || event.operation==='deleted') {
      // TODO: if target was an ephemeral group, delete it
    }
  } else {
    logger.debug(`lambda_job_command_response_handler: event: ${JSON.stringify(event)}`);


  }

  // TODO: configure a lambda destination to handle errors?


}

interface IotRuleJobEvent {
  eventType: 'JOB'
  eventId: string;
  timestamp: number;
  operation: 'completed' | 'canceled' | 'deleted' | 'cancellation_in_progress' | 'deletion_in_progress';
  jobId: string;
  status: 'COMPLETED' | 'CANCELED' | 'DELETED' | 'CANCELLATION_IN_PROGRESS' | 'DELETION_IN_PROGRESS';
  targetSelection: 'SNAPSHOT' | 'CONTINUOUS';
  targets: string[];
  description: string;
  completedAt: number;
  createdAt: number;
  lastUpdatedAt: number;
  jobProcessDetails: {
    numberOfCanceledThings: number;
    numberOfRejectedThings: number;
    numberOfFailedThings: number;
    numberOfRemovedThings: number;
    numberOfSucceededThings: number;
  };
  comment: string;
}

interface IotRuleJobExecutionEvent {
  eventType: 'JOB_EXECUTION';
  eventId: string;
  timestamp: number;
  operation: 'succeeded' | 'failed' | 'rejected' | 'canceled' | 'removed' | 'timed_out';
  jobId: string;
  thingArn: string;
  status: 'SUCCEEDED' | 'FAILED' | 'REJECTED' | 'CANCELED' | 'REMOVED' | 'TIMED_OUT';
  statusDetails: {
    [key: string] : string;
  }
}
