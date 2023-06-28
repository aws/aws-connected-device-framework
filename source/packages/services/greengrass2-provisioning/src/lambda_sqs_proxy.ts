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
import { container } from './di/inversify.config';
import { CoreTasksService } from './coreTasks/coreTasks.service';
import { DeploymentTasksService } from './deploymentTasks/deploymentTasks.service';
import { DeviceTasksService } from './deviceTasks/deviceTasks.service';
import { TYPES } from './di/types';
import { logger } from '@awssolutions/simple-cdf-logger';

const coreTasksSvc: CoreTasksService = container.get(TYPES.CoreTasksService);
const deploymentTasksSvc: DeploymentTasksService = container.get(TYPES.DeploymentTasksService);
const devicesTasksSvc: DeviceTasksService = container.get(TYPES.DeviceTasksService);

// eslint-disable-next-line  @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: unknown) => {
  logger.debug(`lambda_sqs_proxy handler: event: ${JSON.stringify(event)}`);

  if (event?.Records) {
    for (const r of event.Records) {

      if (r.eventSource !== 'aws:sqs') {
        logger.warn(`lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(r)}`);
        continue;
      }

      const messageType = r.messageAttributes?.messageType?.stringValue;
      const body = JSON.parse(r.body);

      switch (messageType) {
        case 'CoreTask:Create':
          await coreTasksSvc.processCreateCoreTaskBatch(body.taskId, body.cores);
          break;
        case 'CoreTaskStatus':
          await coreTasksSvc.updateCoreTaskStatus(body.coreTaskId, body.deviceTaskId, body.counter);
          break;
        case 'CoreTask:Delete':
          await coreTasksSvc.processDeleteCoreTaskBatch(body.taskId, body.cores);
          break;
        case 'DeviceTask:Create':
          await devicesTasksSvc.processCreateDeviceTaskBatch(body.taskId, body.devices);
          break;
        case 'DeviceTask:Delete':
          await devicesTasksSvc.processDeleteDeviceTaskBatch(body.taskId, body.devices);
          break;
        case 'DeploymentTask':
          await deploymentTasksSvc.processDeploymentTask(body);
          break;
        case 'DeploymentTaskBatch':
          await deploymentTasksSvc.processDeploymentTaskBatch(body.id, body.templateName, body.templateVersion, body.deployments);
          break;
        default:
          logger.warn(`lambda_sqs_proxy handler: ignoring un-recognized sqs event`);
      }
    }
  }

  logger.debug(`lambda_sqs_proxy handler: exit:`);

};