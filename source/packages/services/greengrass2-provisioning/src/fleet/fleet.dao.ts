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
 import { inject, injectable } from 'inversify';

 import {
     DynamoDBDocumentClient, PutCommand, PutCommandInput, QueryCommand, QueryCommandInput,
     UpdateCommand, UpdateCommandInput
 } from '@aws-sdk/lib-dynamodb';
 
 import { TYPES } from '../di/types';
 import { DocumentDbClientItem } from '../utils/dynamoDb.util';
 import { logger } from '../utils/logger.util';
 import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pkUtils.util';
 
 @injectable()
 export class FleetDao {
     
     private dbc: DynamoDBDocumentClient;
 
     public constructor(
         @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
     ) {
         this.dbc = ddcFactory()
     }
 
     public async decrementTemplateUsage(type:'desired'|'reported', templateName:string, templateVersion:number, deploymentStatus:string) : Promise<void> {
         logger.debug(`fleet.dao decrementTemplateUsage: in: type:${type}, templateName:${templateName}, templateVersion:${templateVersion}, deploymentStatus:${deploymentStatus}`);
 
         let updateExpression = 'SET #inUse = if_not_exists(#inUse, :start) - :inc';
         if (deploymentStatus !== undefined) {
             updateExpression += ', #deploymentStatus = if_not_exists(#deploymentStatus, :start) - :inc';
         }
 
         const params:UpdateCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             Key: {
                 pk: createDelimitedAttribute(PkType.Fleet, 'templates'),
                 sk: createDelimitedAttribute(PkType.Fleet, type, PkType.Template, templateName, PkType.TemplateVersion, templateVersion)
             },
             UpdateExpression: updateExpression,
             ExpressionAttributeNames: {
                 '#inUse': 'inUse',
                 '#deploymentStatus': deploymentStatus
             },
             ExpressionAttributeValues: {
                 ':start': 1,
                 ':inc': 1
             }
         };
 
         logger.silly(`templates.dao decrementTemplateUsage: params:${JSON.stringify(params)}`);
         const r = await this.dbc.send( new UpdateCommand(params) );
         logger.silly(`templates.dao decrementTemplateUsage: r:${JSON.stringify(r)}`);
 
         logger.debug(`fleet.dao decrementTemplateUsage: exit:`);
    
     }
 
     public async incrementTemplateUsage(type:'desired'|'reported', templateName:string, templateVersion:number, deploymentStatus:string) : Promise<void> {
         logger.debug(`fleet.dao incrementTemplateUsage: in: type:${type}, templateName:${templateName}, templateVersion:${templateVersion}, deploymentStatus:${deploymentStatus}`);
 
         let updateExpression = 'SET #inUse = if_not_exists(#inUse, :start) + :inc';
         if (deploymentStatus !== undefined) {
             updateExpression += ', #deploymentStatus = if_not_exists(#deploymentStatus, :start) + :inc';
         }
 
         const params:UpdateCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             Key: {
                 pk: createDelimitedAttribute(PkType.Fleet, 'templates'),
                 sk: createDelimitedAttribute(PkType.Fleet, type, PkType.Template, templateName, PkType.TemplateVersion, templateVersion)
             },
             UpdateExpression: updateExpression,
             ExpressionAttributeNames: {
                 '#inUse': 'inUse',
                 '#deploymentStatus': deploymentStatus
             },
             ExpressionAttributeValues: {
                 ':start': 0,
                 ':inc': 1
             }
         };
 
         logger.silly(`templates.dao incrementTemplateUsage: params:${JSON.stringify(params)}`);
         const r = await this.dbc.send( new UpdateCommand(params) );
         logger.silly(`templates.dao incrementTemplateUsage: r:${JSON.stringify(r)}`);
 
         logger.debug(`templates.dao incrementTemplateUsage: exit:`);
    
     }
 
     public async initializeTemplateStatistics(templateName:string, templateVersion:number) : Promise<void> {
         logger.debug(`fleet.dao initializeTemplateStatistics: in: templateName:${templateName}, templateVersion:${templateVersion}`);
 
         const params: PutCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             Item: {
                 pk: createDelimitedAttribute(PkType.Fleet, 'templates'),
                 sk: createDelimitedAttribute(PkType.Fleet, 'desired', PkType.Template, templateName, PkType.TemplateVersion, templateVersion)
             }
         };
 
         logger.silly(`templates.dao initializeTemplateStatistics: params:${JSON.stringify(params)}`);
         const r = await this.dbc.send( new PutCommand(params) );
         logger.silly(`templates.dao initializeTemplateStatistics: r:${JSON.stringify(r)}`);
 
         logger.debug(`templates.dao initializeTemplateStatistics: exit:`);
    
     }
 
     public async listTemplateUsage() : Promise<[DesiredTemplateUsage, ReportedTemplateUsage]> {
         logger.debug(`fleet.dao listTemplateUsage: in: `);
 
         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             KeyConditionExpression: `#pk=:pk`,
             ExpressionAttributeNames: {
                 '#pk': 'pk'
             },
             ExpressionAttributeValues: {
                 ':pk': createDelimitedAttribute(PkType.Fleet, 'templates')
             },
             ScanIndexForward: true
         };
 
         let response:[DesiredTemplateUsage, ReportedTemplateUsage] = [undefined, undefined];
 
         logger.silly(`fleet.dao listTemplateUsage: params: ${JSON.stringify(params)}`);
         const results = await this.dbc.send( new QueryCommand(params) );
         logger.silly(`fleet.dao listTemplateUsage: results: ${JSON.stringify(results)}`);
         if ((results?.Items?.length??0)===0) {
             logger.debug(`fleet.dao listTemplateUsage:exit: ${JSON.stringify(response)}`);
             return response;
         }
 
         response = this.assemble(results.Items);
         logger.debug(`fleet.dao listTemplateUsage: exit: ${JSON.stringify(response)}`);
         return response;
     }
 
 
     private assemble(items:DocumentDbClientItem[]) : [DesiredTemplateUsage, ReportedTemplateUsage] {
         logger.debug(`fleet.dao assemble: items:${JSON.stringify(items)}`);
         if (items===undefined) {
             return undefined;
         }
         
         const desiredMap:DesiredTemplateUsage = {};
         const reportedMap:ReportedTemplateUsage = {};
 
         const initDesiredMap = (name:string, version:number) => {
             if (desiredMap[name]===undefined) {
                 desiredMap[name] = {};
             }
             if (desiredMap[name][version]===undefined) {
                 desiredMap[name][version] = {
                     inUse: 0,
                     IN_PROGRESS: 0, 
                     SUCCEEDED: 0, 
                     FAILED: 0
                 };
             }
         };
 
         const initReportedMap = (name:string, version:number) => {
             if (reportedMap[name]===undefined) {
                 reportedMap[name] = {};
             }
             if (reportedMap[name][version]===undefined) {
                 reportedMap[name][version] = 0;
             }
         };
 
         items.forEach(item => {
             const sk = expandDelimitedAttribute(item.sk);
             if (sk.length===6 && sk[0]===PkType.Fleet && sk[2]===PkType.Template && sk[4]===PkType.TemplateVersion) {
                 const type = sk[1];
                 const templateName = sk[3];
                 const templateVersion = parseInt(sk[5]);
 
                 if (type==='reported') {
                     initReportedMap(templateName, templateVersion);
                     reportedMap[templateName][templateVersion] = item.inUse;
                 } else if (type==='desired') {
                     initDesiredMap(templateName, templateVersion);
                     desiredMap[templateName][templateVersion] = {
                         inUse: item.inUse,
                         IN_PROGRESS: item.IN_PROGRESS, 
                         SUCCEEDED: item.None ?? item.SUCCEEDED, 
                         FAILED: item.Failure ?? item.FAILED
                     };
                 }
             }
         });
 
         logger.debug(`fleet.dao assemble: exit: desired:${JSON.stringify(desiredMap)}, reported:${JSON.stringify(reportedMap)}`);
         return [desiredMap, reportedMap];
     }
 }
 
 
 export type ReportedTemplateUsage = {
     [templateName:string]: {
         [templateVersion:number]: number
     }
 }
 
 export type DesiredTemplateUsage = {
     [templateName:string]: {
         [templateVersion:number]: {
             inUse: number,
             IN_PROGRESS: number, 
             SUCCEEDED: number, 
             FAILED: number
         }
     }
 }
 