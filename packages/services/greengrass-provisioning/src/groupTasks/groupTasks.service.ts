/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import shortid from 'shortid';
import ow from 'ow';
import AWS = require('aws-sdk');
import pLimit from 'p-limit';

import { GroupTaskSummaryItem, GroupTaskType} from './groupTasks.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { GroupTasksDao } from './groupTasks.dao';
import { GroupsService } from '../groups/groups.service';
import { GroupItem } from '../groups/groups.models';

@injectable()
export class GroupTasksService  {

    private sqs: AWS.SQS;

    constructor (
        @inject(TYPES.GroupTasksDao) private groupTasksDao: GroupTasksDao,
        @inject(TYPES.GroupsService) private groupsService: GroupsService,
        @inject('aws.sqs.groupTasks') private groupTasksQueue:string,
        @inject('defaults.promisesConcurrency') private promisesConcurrency:number,
        @inject('defaults.groupBatchSize') private groupBatchSize:number,
        @inject(TYPES.SQSFactory) sqsFactory: () => AWS.SQS) {
            this.sqs = sqsFactory();
        }
  
    public async createGroupsTask(items: GroupItem[], taskType:GroupTaskType ) : Promise<GroupTaskSummaryItem> {
        logger.debug(`groupTasks.service createGroupsTask: in: items:${JSON.stringify(items)}, taskType${taskType}`);

        // validation
        ow(items, 'groups', ow.array.nonEmpty.minLength(1));
        for(const g of items) {
            ow(g.name, ow.string.nonEmpty);
            if (taskType==='Create') {
                ow(g.templateName, ow.string.nonEmpty);
            }
        }

        // create the task
        const taskId = shortid.generate();
        const taskInfo:GroupTaskSummaryItem = {
            taskId,
            taskStatus: 'Waiting',
            type: taskType,
            createdAt: new Date(),
            updatedAt: new Date(),
            groups: items.map(g=> {
                return {...g, taskStatus:'Waiting'};
            })
        };

        // there could be 1000's of requested groups, therefore split into batches for processing
        const batcher = <T>(items: T[]) =>
            items.reduce((chunks: T[][], item: T, index) => {
                const chunk = Math.floor(index / this.groupBatchSize);
                chunks[chunk] = ([] as T[]).concat(chunks[chunk] || [], item);
                return chunks;
            }, []);
        const batches = batcher(taskInfo.groups);   
        taskInfo.batchesTotal = batches.length;
        taskInfo.batchesComplete = 0;

        // save it
        await this.groupTasksDao.save(taskInfo);

        // send each batch of groups to sqs
        const sqsFutures:Promise<AWS.SQS.SendMessageResult>[]= [];
        const limit = pLimit(this.promisesConcurrency);
        for (const batch of batches) {
            sqsFutures.push( 
                limit(()=> this.sqs.sendMessage({
                    QueueUrl: this.groupTasksQueue,
                    MessageBody: JSON.stringify({
                        taskId: taskInfo.taskId,
                        groups: batch
                    }),
                    MessageAttributes: {
                        messageType: {
                            DataType: 'String',
                            StringValue: `GroupTask:${taskType}`
                        }
                    }
                }).promise())
            );
        }
        await Promise.all(sqsFutures);

        logger.debug(`groupTasks.service createGroupsTask: exit: taskInfo:${JSON.stringify(taskInfo)}`);
        return taskInfo;
    }

    public async getGroupsTask(taskId:string) : Promise<GroupTaskSummaryItem> {
        logger.debug(`groupTasks.service getGroupsTask: in: taskId:${taskId}`);

        // validation
        ow(taskId, 'Group Task Id', ow.string.nonEmpty);

        // hydrate the task
        const task = await this.groupTasksDao.get(taskId);
        if (task===undefined) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`groupTasks.service getGroupsTask: exit: taskInfo:${JSON.stringify(task)}`);
        return task;
    }

    public async processCreateGroupsTaskBatch(taskId:string, groups:GroupItem[]): Promise<void> {
        logger.debug(`groupTasks.service processCreateGroupsTaskBatch: in: taskId:${taskId}, groups:${JSON.stringify(groups)}`);

        let failed=false;
        let failedReason:string;

        try {
            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(groups, ow.array.nonEmpty.minLength(1));
            for(const g of groups) {
                ow(g.name, ow.string.nonEmpty);
                ow(g.templateName, ow.string.nonEmpty);
            }

            // create the groups
            groups = (await this.groupsService.createGroups({groups})).groups;

        } catch (e) {
            logger.error(`groupTasks.service processCreateGroupsTaskBatch: e: ${JSON.stringify(e)}`);
            failed=true;
            failedReason=e.message;   
        } 

        // update the batch and task
        await this.saveBatchStatus(taskId, groups, failed, failedReason);

        logger.debug(`groupTasks.service processCreateGroupsTaskBatch: exit:`);
    }

    public async processUpdateGroupsTaskBatch(taskId:string, groups:GroupItem[]): Promise<void> {
        logger.debug(`groupTasks.service processUpdateGroupsTaskBatch: in: taskId:${taskId}, groups:${JSON.stringify(groups)}`);

        let failed=false;
        let failedReason:string;

        try {

            // validation
            ow(taskId, ow.string.nonEmpty);
            ow(groups, ow.array.nonEmpty.minLength(1));
            for(const g of groups) {
                ow(g.name, ow.string.nonEmpty);
            }

            // create the groups
            groups = (await this.groupsService.updateGroups({groups})).groups;

        } catch (e) {
            logger.error(`groupTasks.service processUpdateGroupsTaskBatch: e: ${JSON.stringify(e)}`);
            failed=true;
            failedReason=e.message;   
        } 

        // update the batch and task
        await this.saveBatchStatus(taskId, groups, failed, failedReason);

        logger.debug(`groupTasks.service processUpdateGroupsTaskBatch: exit:`);
    }

    private async saveBatchStatus(taskId:string, groups:GroupItem[], failed:boolean, failedReason:string): Promise<void> {
        logger.debug(`groupTasks.service saveBatchStatus: in: taskId:${taskId}, groups:${JSON.stringify(groups)}`);

        // update the batch progress
        const batchProgress = await this.groupTasksDao.incrementBatchesCompleted(taskId);

        //  update the task status
        const task = await this.groupTasksDao.get(taskId, true);
        if (task!==undefined) {
            // determine if failed
            const hasFailedGroups = groups.some(g=> g.taskStatus==='Failure');
            if (task.taskStatus==='Failure' || failed || hasFailedGroups) {
                task.taskStatus==='Failure';
                task.statusMessage = task.statusMessage ?? failedReason;
            }
            // add in the updated group status to save
            task.groups = groups;
            
            // if all batches have been completes, update the overall task state if complete
            if (batchProgress.complete===batchProgress.total) {
                if (task.taskStatus!=='Failure') {
                    task.taskStatus='Success';
                }
            }
            await this.groupTasksDao.save(task);
        }
        logger.debug(`groupTasks.service saveBatchStatus: exit:`);
    }
}
