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
 import { CoresService } from './cores/cores.service';
 import { container } from './di/inversify.config';
 import { TYPES } from './di/types';
 import { TemplatesService } from './templates/templates.service';
 import { logger } from './utils/logger.util';
 
 const coresService = container.get<CoresService>(TYPES.CoresService);
 const templateService = container.get<TemplatesService>(TYPES.TemplatesService);
 
 exports.handler = async (event: JobEvent, _context: unknown) : Promise<void> => {
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
 
   // get the template name/version that relates to this job
   const template = await templateService.getByJobId(event.jobId);
 
   // save the reported template version of the core
   const coreName = event.thingArn.split('/')[1];
   await coresService.associateTemplate(coreName, template.name, template.version as number, 'reported', event.statusDetails['detailed-deployment-status']);
 
   logger.debug(`lambda_job_execution_proxy handler: exit:`);
 
 };
 
 interface JobEvent {
   eventType:string,
   operation:string,
   jobId:string,
   thingArn:string,
   status:string,
   statusDetails: {
     'detailed-deployment-status': string
   }
 }
 