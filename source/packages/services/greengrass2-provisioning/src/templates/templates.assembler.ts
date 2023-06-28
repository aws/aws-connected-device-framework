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
 import { TemplateListPaginationKey, TemplateVersionListPaginationKey } from './templates.dao';
 import {
     EditableTemplateResource, TemplateItem, TemplateListResource, TemplateResource,
     TemplateVersionListResource
 } from './templates.models';

 @injectable()
 export class TemplatesAssembler {

     public toResource(item:TemplateItem): TemplateResource {
         logger.debug(`templates.assembler toResource: in: item:${JSON.stringify(item)}`);

         const resource: TemplateResource = {
             name: item.name,
             version: item.version,
             components: item.components,
             jobConfig: item.jobConfig,
             deploymentPolicies: item.deploymentPolicies,
             deployment: item.deployment,
             createdAt: item.createdAt,
             updatedAt: item.updatedAt
         }

         logger.debug(`templates.assembler toResource: exit:${JSON.stringify(resource)}`);
         return resource;
     }

     public toItem(resource:EditableTemplateResource): TemplateItem {
         logger.debug(`templates.assembler toItem: in: resource:${JSON.stringify(resource)}`);

         const item: TemplateItem = {
             name: resource.name,
             components: resource.components,
             jobConfig: resource.jobConfig,
             deploymentPolicies: resource.deploymentPolicies,
         }

         logger.debug(`templates.assembler toItem: exit:${JSON.stringify(item)}`);
         return item;
     }

     public toListResource(items:TemplateItem[], count?:number, paginateFrom?:TemplateListPaginationKey ): TemplateListResource {
         logger.debug(`templates.assembler toListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

         const list:TemplateListResource= {
             templates:[]
         };

         if (count!==undefined || paginateFrom!==undefined) {
             list.pagination = {};
         }

         if (count!==undefined) {
             list.pagination.count=count;
         }

         if (paginateFrom!==undefined) {
             list.pagination.lastEvaluated = {
                 name: paginateFrom?.name
             };
         }

         if ((items?.length??0)>0) {
             items.forEach(i=> list.templates.push(this.toResource(i)));
         }

         logger.debug(`templates.assembler toListResource: exit: ${JSON.stringify(list)}`);
         return list;

     }
     public toVersionListResource(items:TemplateItem[], count?:number, paginateFrom?:TemplateVersionListPaginationKey ): TemplateVersionListResource {
         logger.debug(`templates.assembler toVersionListResource: in: items:${JSON.stringify(items)}, count:${count}, paginateFrom:${JSON.stringify(paginateFrom)}`);

         const list:TemplateVersionListResource= {
             templates:[]
         };

         if (count!==undefined || paginateFrom!==undefined) {
             list.pagination = {};
         }

         if (count!==undefined) {
             list.pagination.count=count;
         }

         if (paginateFrom!==undefined) {
             list.pagination.lastEvaluated = {
                 version: paginateFrom?.version
             };
         }

         if ((items?.length??0)>0) {
             items.forEach(i=> list.templates.push(this.toResource(i)));
         }

         logger.debug(`templates.assembler toVersionListResource: exit: ${JSON.stringify(list)}`);
         return list;

     }
 }
