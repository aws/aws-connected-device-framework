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
import '@awssolutions/cdf-config-inject';
import { logger } from './utils/logger';
import ow from 'ow';
import { Simulation } from './simulation';

exports.handler = async (event: any, _context: any) => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  ow(event, ow.object.nonEmpty);
  ow(event.Records, ow.array.nonEmpty);
  ow(event.Records[0].EventSource, ow.string.equals('aws:sns'));

  const region = process.env.AWS_REGION;
  const request = JSON.parse(event.Records[0].Sns.Message);

  ow(region, ow.string.nonEmpty);
  ow(request.simulationId, ow.string.nonEmpty);
  ow(request.instances, ow.number.greaterThan(0));
  ow(request.s3RootKey, ow.string.nonEmpty);

  const simulator = new Simulation(region);
  await simulator.launch({
    simulationId: request.simulationId,
    instances: request.instances,
    s3RootKey: request.s3RootKey,
    taskOverrides: request.taskOverrides
  });

};
