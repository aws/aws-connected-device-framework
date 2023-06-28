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
 import { injectable } from 'inversify';

 import { logger } from '@awssolutions/simple-cdf-logger';
 import { CoreListPaginationKey } from './cores.dao';
 import { CoreItem, CoreListResource, CoreResource, NewCoreResource } from './cores.models';

 @injectable()
 export class CoresAssembler {

     public toResource(item:CoreItem): CoreResource {
         logger.debug(`cores.assembler toResource: in: item:${JSON.stringify(item)}`);

         const resource: CoreResource = {
             name: item.name,
             provisioningTemplate: item.provisioningTemplate,
             provisioningParameters: item.provisioningParameters,
             cdfProvisioningParameters: item.cdfProvisioningParameters,
             configFileGenerator: item.configFileGenerator,
             taskStatus: item.taskStatus,
             statusMessage: item.statusMessage,
             artifacts: item.artifacts,
             device: item.device,
             template: item.template,
             createdAt: item.createdAt,
             updatedAt: item.updatedAt,
         }

         logger.debug(`cores.assembler toResource: exit:${JSON.stringify(resource)}`);
         return resource;
     }

     public toItem(resource:NewCoreResource): CoreItem {
         logger.debug(`cores.assembler toItem: in: resource:${JSON.stringify(resource)}`);

         const item: CoreItem = {
             name: resource.name,
             provisioningTemplate: resource.provisioningTemplate,
             provisioningParameters: resource.provisioningParameters,
             cdfProvisioningParameters: resource.cdfProvisioningParameters,
             configFileGenerator: resource.configFileGenerator,
         }

         logger.debug(`cores.assembler toItem: exit:${JSON.stringify(item)}`);
         return item;
     }

     // TODO: pagination
     public toListResource(items:CoreItem[], count?:number, paginateFrom?:CoreListPaginationKey ): CoreListResource {
         logger.debug(`cores.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

         const list:CoreListResource= {
             cores:[]
         };

         if (count!==undefined || paginateFrom!==undefined) {
             list.pagination = {};
         }

         if (count!==undefined) {
             list.pagination.count=count;
         }

         if (paginateFrom!==undefined) {
             list.pagination.lastEvaluated = {
                 thingName: paginateFrom?.thingName
             };
         }

         if ((items?.length??0)>0) {
             items.forEach(i=> list.cores.push(this.toResource(i)));
         }

         logger.debug(`cores.assembler toListResource: exit: ${JSON.stringify(list)}`);
         return list;

     }

     public toResourceArray(items:CoreItem[]): CoreResource[] {
         logger.debug(`cores.assembler toResourceArray: in: items:${JSON.stringify(items)}`);

         const reources:CoreResource[]=[];

         if ((items?.length??0)>0) {
             items.forEach(i=> reources.push(this.toResource(i)));
         }

         logger.debug(`cores.assembler toResourceArray: exit: ${JSON.stringify(reources)}`);
         return reources;

     }
 }
