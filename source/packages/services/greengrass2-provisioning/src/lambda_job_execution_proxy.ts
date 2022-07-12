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
import { CoresService } from './cores/cores.service';
import { TYPES } from './di/types';
import { logger } from './utils/logger.util';
import { DeploymentTasksService } from './deploymentTasks/deploymentTasks.service';
import { CDFEventPublisher, EVENT_PUBLISHER_TYPES } from '@cdf/event-publisher'
import { CoreTemplateUpdatedEvent, CoreTemplateUpdatedPayload } from './cores/cores.models';
import { DeploymentsService } from './deployments/deployments.service';

const coresService = container.get<CoresService>(TYPES.CoresService);
const deploymentsService = container.get<DeploymentsService>(TYPES.DeploymentsService);
const cdfEventPublisher = container.get<CDFEventPublisher>(EVENT_PUBLISHER_TYPES.CDFEventPublisher)
const deploymentTasksService = container.get<DeploymentTasksService>(TYPES.DeploymentTasksService);

exports.handler = async (event: JobEvent, _context: unknown): Promise<void> => {
  logger.debug(`lambda_job_execution_proxy handler: event: ${JSON.stringify(event)}`);

  // ignore messages we are not interested in
  if (event.eventType !== 'JOB_EXECUTION') {
    logger.warn(`lambda_job_execution_proxy handler: invalid eventType!`);
    return;
  }
  if (event.statusDetails?.['detailed-deployment-status'] === undefined) {
    logger.debug(`lambda_job_execution_proxy handler: ignoring as missing detailed-deployment-status!`);
    return;
  }
  if (event.jobId === undefined) {
    logger.warn(`lambda_job_execution_proxy handler: missing jobId!`);
    return;
  }
  if (event.thingArn === undefined) {
    logger.warn(`lambda_job_execution_proxy handler: missing thingArn!`);
    return;
  }
  if (event.operation === undefined) {
    logger.warn(`lambda_job_execution_proxy handler: missing operation!`);
    return;
  }

  // get the template and deploymentId
  const { template, id } = await deploymentTasksService.getByJobId(event.jobId)
  const deploymentId = await deploymentsService.getDeploymentIdByJobId(event.jobId)

  const deploymentStatus = event.statusDetails['detailed-deployment-status']

  // save the reported template version of the core
  const coreName = event.thingArn.split('/')[1];

  await coresService.associateTemplate(coreName, template.name, template.version as number, 'reported', deploymentStatus);

  await cdfEventPublisher.emitEvent<CoreTemplateUpdatedPayload>(
    {
      name: CoreTemplateUpdatedEvent, payload: {
        coreName,
        deploymentTaskId: id,
        deploymentId: deploymentId,
        jobId: event.jobId,
        templateName: template.name,
        templateVersion: template.version,
        status: deploymentStatus === 'SUCCESSFUL' ? 'success' : 'failed',
      }
    })

  logger.debug(`lambda_job_execution_proxy handler: exit:`);

};

interface JobEvent {
  eventType: string,
  operation: string,
  jobId: string,
  thingArn: string,
  status: string,
  statusDetails: {
    'detailed-deployment-status': string
  }
}
