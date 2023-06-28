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
 import ow from 'ow';
 import pLimit from 'p-limit';

 import {
     BatchWriteCommand, BatchWriteCommandInput, DynamoDBDocumentClient, QueryCommand,
     QueryCommandInput, TransactWriteCommand, TransactWriteCommandInput, UpdateCommand,
     UpdateCommandInput
 } from '@aws-sdk/lib-dynamodb';

 import {
     DynamoDbPaginationKey, GSI1_INDEX_NAME, GSI2_INDEX_NAME, GSI3_INDEX_NAME, GSI4_INDEX_NAME,
     GSI5_INDEX_NAME, GSI6_INDEX_NAME
 } from '../common/common.models';
 import { TYPES } from '../di/types';
 import { DocumentDbClientItem } from '../utils/dynamoDb.util';
 import { logger } from '@awssolutions/simple-cdf-logger';
 import { createDelimitedAttribute, expandDelimitedAttribute, PkType } from '../utils/pkUtils.util';
 import { Artifact, CoreItem, FailedCoreDeployment } from './cores.models';

 @injectable()
 export class CoresDao {

     private dbc: DynamoDBDocumentClient;

     public constructor(
         @inject(TYPES.DynamoDBDocumentFactory) ddcFactory: () => DynamoDBDocumentClient,
     ) {
         this.dbc = ddcFactory()
     }

     public async get(name:string) : Promise<CoreItem> {
         logger.debug(`cores.dao get: in: name:${name}`);

         const coreDbId =  createDelimitedAttribute(PkType.CoreDevice, name);

         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             KeyConditionExpression: `#pk=:pk`,
             ExpressionAttributeNames: {
                 '#pk': 'pk'
             },
             ExpressionAttributeValues: {
                 ':pk': coreDbId
             }
         };

         const result = await this.dbc.send( new QueryCommand(params) );
         if ((result.Items?.length??0)===0) {
             logger.debug('cores.dao get: exit: undefined');
             return undefined;
         }

         const task = this.assemble(result.Items)?.[0];
         logger.debug(`cores.dao get: exit: ${JSON.stringify(task)}`);
         return task;
     }

     private assemble(items:DocumentDbClientItem[]) : CoreItem[] {
         logger.debug(`cores.dao assemble: in: items:${JSON.stringify(items)}`);
         if (items===undefined) {
             return undefined;
         }

         const c: {[thingName:string]: CoreItem} = {};
         const a: {[thingName:string]: {[key : string] : Artifact}} = {};
         items.forEach(item => {
             const pk = expandDelimitedAttribute(item.pk);
             const sk = expandDelimitedAttribute(item.sk);
             const thingName = pk[1];

             if (sk.length===2 && sk[0]===PkType.CoreDevice) {
                 // main core device item
                 c[thingName]= {
                     name: item.name,
                     provisioningTemplate: item.provisioningTemplate,
                     provisioningParameters: item.provisioningParameters,
                     cdfProvisioningParameters: item.cdfProvisioningParameters,
                     taskStatus: item.taskStatus,
                     statusMessage: item.statusMessage,
                     createdAt: new Date(item.createdAt),
                     updatedAt: new Date(item.updatedAt),
                     template: {
                         desired: {
                             name: item.desiredTemplateName,
                             version: item.desiredTemplateVersion
                         },
                         reported: {
                             name: item.reportedTemplateName,
                             version: item.reportedTemplateVersion,
                             deploymentStatus: item.deploymentStatus,
                             deploymentStatusMessage: item.deploymentStatusMessage,
                             jobStatus: item.jobStatus,
                         }
                     },
                 };
             } else if (sk.length===4 && sk[0]===PkType.CoreDevice && sk[2]===PkType.Artifact) {
                 // core specific artifacts
                 if (a[thingName]===undefined) {
                     a[thingName] = {};
                 }
                 const artifactKey = sk[3];
                 a[thingName][artifactKey] = {
                     bucket: item.bucket,
                     key: item.key,
                     createdAt: new Date(item.createdAt)
                 };
             }
         });

         Object.keys(c).forEach(k => {
             c[k].artifacts = a[k];
         });

         const response = Object.values(c);
         logger.debug(`cores.dao assemble: exit:${JSON.stringify(response)}`);
         return response;
     }

     public async associateTemplate(coreName:string, templateName:string, templateVersion:number, state:'desired'|'reported', deploymentStatus?:string, deploymentStatusMessage?:string) : Promise<void> {

         logger.debug(`cores.dao associateTemplate: in: coreName:${coreName}, templateName:${templateName}, templateVersion:${templateVersion}, state:${state}, deploymentStatus:${deploymentStatus}, deploymentStatusMessage:${deploymentStatusMessage}`);

         ow(coreName, ow.string.nonEmpty);
         ow(state, 'state', ow.string.oneOf(['reported','desired']));

         const params:UpdateCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             Key: {
                 pk: createDelimitedAttribute(PkType.CoreDevice, coreName),
                 sk: createDelimitedAttribute(PkType.CoreDevice, coreName),
             }
         }

         const setExpressions:string[]= [];
         const removeExpressions:string[]= [];

         if (state==='desired') {
             // always update the desired template and version
             setExpressions.push('#templateName=:templateName', '#templateVersion=:templateVersion', '#siKey2=:siKey2', '#siKey3=:siKey3');
             params.ExpressionAttributeNames = {
                 '#templateName': 'desiredTemplateName',
                 '#templateVersion': 'desiredTemplateVersion',
                 '#siKey2': 'siKey2',
                 '#siKey3': 'siKey3',
             };
             params.ExpressionAttributeValues = {
                 ':templateName': templateName,
                 ':templateVersion': templateVersion,
                 ':siKey2': createDelimitedAttribute(PkType.Template, templateName, PkType.CoreDevice),
                 ':siKey3': createDelimitedAttribute(PkType.Template, templateName, PkType.TemplateVersion, templateVersion),
             }

             if (deploymentStatus!==undefined) {
                 // if a deployment status has been specified, update it
                 setExpressions.push('#deploymentStatus=:deploymentStatus');
                 params.ExpressionAttributeNames['#deploymentStatus'] = 'deploymentStatus';
                 params.ExpressionAttributeValues[':deploymentStatus'] = deploymentStatus;

                 params.ExpressionAttributeNames['#siKey4'] = 'siKey4';
                 params.ExpressionAttributeNames['#siKey5'] = 'siKey5';
                 params.ExpressionAttributeNames['#siKey6'] = 'siKey6';

                 if (deploymentStatus!=='SUCCESSFUL') {
                     // if a deployment has failed, update siKey 4/5/6 which are used for tracking failed deployments
                     setExpressions.push('#siKey4=:siKey4', '#siKey5=:siKey5', '#siKey6=:siKey6');
                     params.ExpressionAttributeValues[':siKey4'] = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED');
                     params.ExpressionAttributeValues[':siKey5'] = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, templateName);
                     params.ExpressionAttributeValues[':siKey6'] = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, templateName, PkType.TemplateVersion, templateVersion);
                 } else {
                     // else we remove the si keys
                     removeExpressions.push('#siKey4', '#siKey5', '#siKey6');
                 }
             }

             params.ExpressionAttributeNames['#deploymentStatusMessage'] = 'deploymentStatusMessage';

             if (deploymentStatusMessage!==undefined) {
                 setExpressions.push('#deploymentStatusMessage=:deploymentStatusMessage');
                 params.ExpressionAttributeValues[':deploymentStatusMessage'] = deploymentStatusMessage;
             } else {
                 removeExpressions.push('#deploymentStatusMessage');
             }

         } else if (state==='reported') {
             // for repotred we always just update the template and version
             setExpressions.push('#templateName=:templateName', '#templateVersion=:templateVersion');
             params.ExpressionAttributeNames = {
                 '#templateName': 'reportedTemplateName',
                 '#templateVersion': 'reportedTemplateVersion'
             };
             params.ExpressionAttributeValues = {
                 ':templateName': templateName,
                 ':templateVersion': templateVersion,
             }
         }

         params.UpdateExpression = `SET ${setExpressions.join(',')}`;
         if (removeExpressions.length>0) params.UpdateExpression += ` REMOVE ${removeExpressions.join(',')}`;

         logger.silly(`cores.dao associateTemplate: params:${JSON.stringify(params)}`);
         const r = await this.dbc.send( new UpdateCommand(params) );
         logger.silly(`cores.dao associateTemplate: r:${JSON.stringify(r)}`);

         logger.debug(`cores.dao associateTemplate: exit:`);

     }

     public async associateFailedDeploymentStarts(cores:FailedCoreDeployment[]) : Promise<void> {
         logger.debug(`cores.dao associateFailedDeploymentStarts: in: cores:${JSON.stringify(cores)}`);

         const items:TransactWriteCommandInput = {
             TransactItems: []
         }

         cores.forEach(c => {
             const coreDbId = createDelimitedAttribute(PkType.CoreDevice, c.name);

             items.TransactItems.push({
                 Update: {
                     TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
                     Key: {
                         pk: coreDbId,
                         sk: coreDbId,
                     },
                     UpdateExpression: 'SET #deploymentStatus=:deploymentStatus, #deploymentStatusMessage=:deploymentStatusMessage, #siKey4=:siKey4, #siKey5=:siKey5, #siKey6=:siKey6',
                     ExpressionAttributeNames: {
                         '#deploymentStatus': 'deploymentStatus',
                         '#deploymentStatusMessage': 'deploymentStatusMessage',
                         '#siKey4': 'siKey4',
                         '#siKey5': 'siKey5',
                         '#siKey6': 'siKey6',
                     },
                     ExpressionAttributeValues: {
                         ':deploymentStatus': c.deploymentStatus,
                         ':deploymentStatusMessage': c.deploymentStatusMessage,
                         ':siKey4': createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED'),
                         ':siKey5': createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, c.templateName),
                         ':siKey6': createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, c.templateName, PkType.TemplateVersion, c.templateVersion),
                     }
                 }
             });
         });

         // TransactWriteTems can process max 25 items at a time
         const batcher = <T>(items: T[]) =>
             items.reduce((chunks: T[][], item: T, index) => {
                 const chunk = Math.floor(index / 25);
                 chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                 return chunks;
             }, []);
         const batches = batcher(items.TransactItems);

         // run concurrently to speed up, but throttle so we don't exceed dynamodb provisioned throughput
         const futures:Promise<unknown>[] = [];
         const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
         for (const batch of batches) {
             futures.push(
                 limit(async ()=> {
                     return this.dbc.send( new TransactWriteCommand({ TransactItems: batch }));
                 })
             );
         }

         // TODO: check for errors and reprocess
         const results = await Promise.allSettled(futures);
         const rejected = results.filter(r => r.status === 'rejected');
         if (rejected.length > 0) {
             logger.debug(`cores.dao associateFailedDeploymentStarts: rejected:${JSON.stringify(rejected)}`);
         }

         logger.debug(`cores.dao associateFailedDeploymentStarts: exit:`);

     }

     public async delete(name:string) : Promise<void> {
         logger.debug(`cores.dao delete: in: name:${name}`);

         const coreDbId =  createDelimitedAttribute(PkType.CoreDevice, name);

         const queryParams:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             KeyConditionExpression: `#pk=:pk`,
             ExpressionAttributeNames: {
                 '#pk': 'pk'
             },
             ExpressionAttributeValues: {
                 ':pk': coreDbId
             }
         };

         const result = await this.dbc.send( new QueryCommand(queryParams) );
         if ((result.Items?.length??0)>0) {
             const deleteParams:BatchWriteCommandInput = {
                 RequestItems: {
                     [process.env.AWS_DYNAMODB_TABLE_NAME]: []
                 }
             };

             result.Items.forEach(item => {
                 deleteParams.RequestItems[process.env.AWS_DYNAMODB_TABLE_NAME].push({
                     DeleteRequest: {
                         Key: {
                             pk: item.pk,
                             sk: item.sk
                         }
                     }
                 });
             });

             logger.silly(`cores.dao delete: batchWriteResponse: deleteParam:${JSON.stringify(deleteParams)}`)
             const batchWriteResponse = await this.dbc.send( new BatchWriteCommand(deleteParams) );
             logger.silly(`cores.dao delete: batchWriteResponse: result:${JSON.stringify(batchWriteResponse)}`)
         }

         logger.debug('cores.dao delete: exit:');
     }

     public async list(templateName:string, templateVersion:number, failedOnly:boolean, count:number, exclusiveStart:CoreListPaginationKey): Promise<[CoreItem[],CoreListPaginationKey]> {
         logger.debug(`cores.dao list: in: templateName:${templateName}, failedOnly:${failedOnly}, count:${count}, exclusiveStart:${JSON.stringify(exclusiveStart)}`);

         let params:QueryCommandInput;
         if (failedOnly) {
             params = this.generateListFilteredByFailedDeployments(templateName, templateVersion, count, exclusiveStart);
         } else if (templateVersion!==undefined) {
             params = this.generateListFilteredByTemplateVersionQuery(templateName, templateVersion, count, exclusiveStart);
         } else if (templateName!==undefined) {
             params = this.generateListFilteredByTemplateQuery(templateName, count, exclusiveStart);
         } else {
             params = this.generateListQuery(count, exclusiveStart);
         }

         logger.silly(`cores.dao list: params: ${JSON.stringify(params)}`);

         const results = await this.dbc.send( new QueryCommand(params) );
         if ((results?.Items?.length??0)===0) {
             logger.debug('cores.dao list: exit: undefined');
             return [undefined,undefined];
         }
         logger.silly(`cores.dao list: results: ${JSON.stringify(results)}`);

         const response = this.assemble(results.Items);
         let paginationKey:CoreListPaginationKey;
         if (results.LastEvaluatedKey) {
             const lastEvaluatedThingName = expandDelimitedAttribute(results.LastEvaluatedKey.pk)[1];
             paginationKey = {
                 thingName: lastEvaluatedThingName
             }
         }

         logger.debug(`cores.dao list: exit: response:${JSON.stringify(response)}, paginationKey:${paginationKey}`);
         return [response, paginationKey];
     }

     private generateListQuery(count?:number, exclusiveStart?:CoreListPaginationKey) : QueryCommandInput {

         let exclusiveStartKey:DynamoDbPaginationKey;
         if (exclusiveStart?.thingName) {
             exclusiveStartKey = {
                 pk: createDelimitedAttribute(PkType.CoreDevice, exclusiveStart.thingName),
                 sk: createDelimitedAttribute(PkType.CoreDevice, exclusiveStart.thingName),
                 siKey1: PkType.CoreDevice,
             }
         }

         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             IndexName: GSI1_INDEX_NAME,
             KeyConditionExpression: `#hash=:hash`,
             ExpressionAttributeNames: {
                 '#hash': 'siKey1'
             },
             ExpressionAttributeValues: {
                 ':hash': PkType.CoreDevice
             },
             Select: 'ALL_ATTRIBUTES',
             ExclusiveStartKey: exclusiveStartKey,
             Limit: count
         };

         return params;
     }

     private generateListFilteredByTemplateQuery(templateName:string, count?:number, exclusiveStart?:CoreListPaginationKey) : QueryCommandInput {

         const thingNameDbId = createDelimitedAttribute(PkType.CoreDevice, exclusiveStart.thingName);
         const templateDbId = createDelimitedAttribute(PkType.Template, templateName, PkType.CoreDevice);

         let exclusiveStartKey:DynamoDbPaginationKey;
         if (exclusiveStart?.thingName) {
             exclusiveStartKey = {
                 pk: thingNameDbId,
                 sk: thingNameDbId,
                 siKey2: templateDbId,
                 siSort2: thingNameDbId,
             }
         }

         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             IndexName: GSI2_INDEX_NAME,
             KeyConditionExpression: `#hash=:hash`,
             ExpressionAttributeNames: {
                 '#hash': 'siKey2'
             },
             ExpressionAttributeValues: {
                 ':hash':templateDbId
             },
             Select: 'ALL_ATTRIBUTES',
             ExclusiveStartKey: exclusiveStartKey,
             Limit: count
         };

         return params;
     }

     private generateListFilteredByTemplateVersionQuery(templateName:string, templateVersion:number, count?:number, exclusiveStart?:CoreListPaginationKey) : QueryCommandInput {

         const thingNameDbId = createDelimitedAttribute(PkType.CoreDevice, exclusiveStart.thingName);
         const templateDbId = createDelimitedAttribute(PkType.Template, templateName, PkType.TemplateVersion, templateVersion);

         let exclusiveStartKey:DynamoDbPaginationKey;
         if (exclusiveStart?.thingName) {
             exclusiveStartKey = {
                 pk: thingNameDbId,
                 sk: thingNameDbId,
                 siKey3: templateDbId,
                 siSort3: thingNameDbId,
             }
         }

         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             IndexName: GSI3_INDEX_NAME,
             KeyConditionExpression: `#hash=:hash`,
             ExpressionAttributeNames: {
                 '#hash': 'siKey3'
             },
             ExpressionAttributeValues: {
                 ':hash':templateDbId
             },
             Select: 'ALL_ATTRIBUTES',
             ExclusiveStartKey: exclusiveStartKey,
             Limit: count
         };

         return params;
     }


     private generateListFilteredByFailedDeployments(templateName?:string, templateVersion?:number, count?:number, exclusiveStart?:CoreListPaginationKey) : QueryCommandInput {

         const thingNameDbId = createDelimitedAttribute(PkType.CoreDevice, exclusiveStart.thingName);

         let exclusiveStartKey:DynamoDbPaginationKey;
         if (exclusiveStart?.thingName) {
             exclusiveStartKey = {
                 pk: thingNameDbId,
                 sk: thingNameDbId,
             }
         }

         let indexName:string;
         let siKeyDbId:string;
         let hash:string;
         if (templateName===undefined) {
             indexName = GSI4_INDEX_NAME;
             siKeyDbId = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED');
             hash='siKey4';
             if (exclusiveStart?.thingName) {
                 exclusiveStartKey.siKey4 = siKeyDbId;
                 exclusiveStartKey.siSort4 = thingNameDbId;
             }
         } else if (templateVersion===undefined) {
             indexName = GSI5_INDEX_NAME;
             siKeyDbId = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, templateName);
             hash='siKey5';
             if (exclusiveStart?.thingName) {
                 exclusiveStartKey.siKey5 = siKeyDbId;
                 exclusiveStartKey.siSort5 = thingNameDbId;
             }
         } else {
             indexName = GSI6_INDEX_NAME;
             siKeyDbId = createDelimitedAttribute(PkType.DeploymentStatus, 'FAILED', PkType.Template, templateName, PkType.TemplateVersion, templateVersion);
             hash='siKey6';
             if (exclusiveStart?.thingName) {
                 exclusiveStartKey.siKey6 = siKeyDbId;
                 exclusiveStartKey.siSort6 = thingNameDbId;
             }
         }

         const params:QueryCommandInput = {
             TableName: process.env.AWS_DYNAMODB_TABLE_NAME,
             IndexName: indexName,
             KeyConditionExpression: `#hash=:hash`,
             ExpressionAttributeNames: {
                 '#hash': hash
             },
             ExpressionAttributeValues: {
                 ':hash': siKeyDbId
             },
             Select: 'ALL_ATTRIBUTES',
             ExclusiveStartKey: exclusiveStartKey,
             Limit: count
         };

         return params;
     }

 }

 export type CoreListPaginationKey = {
     thingName:string;
 }