/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { CommandModel, CommandListModel, CommandType, ExecutionSummaryListModel, ExecutionStatus, JobStatus, ExecutionModel, CommandStatus } from './commands.models';
import { CommandsDao } from './commands.dao';
import { WorkflowFactory } from './workflow/workflow.factory';
import { WorkflowAction } from './workflow/workflow.interfaces';
import { InvalidTransitionAction } from './workflow/workflow.invalidTransition';
import {v1 as uuid} from 'uuid';
import * as fs from 'fs';
import * as stream from 'stream';
import * as util from 'util';

@injectable()
export class CommandsService {

    private _iot: AWS.Iot;
    private _s3: AWS.S3;
    private _unlinkAsync = util.promisify(fs.unlink);

    constructor(
        @inject(TYPES.CommandsDao) private commandsDao: CommandsDao,
        @inject(TYPES.WorkflowFactory) private workflowFactory: WorkflowFactory,
        @inject('aws.s3.bucket') private s3Bucket: string,
        @inject('aws.s3.prefix') private s3Prefix: string,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3 ) {
            this._iot = iotFactory();
            this._s3 = s3Factory();
    }

    public async get(commandId: string):Promise<CommandModel> {
        logger.debug(`commands.service get: in:commandId:${commandId}`);

        // TODO: improve the performance of this by running the promises in parallel

        const command = await this.commandsDao.get(commandId);
        if (command===undefined) {
            logger.debug('commands.service get: exit: command:undefined');
            return command;
        }

        try {
            // if a job has been created, use its values instead of the ones we have stored
            const jobId =  `cdf-${commandId}`;
            const job = await this._iot.describeJob({jobId}).promise();

            if (job !== undefined) {
                command.type = CommandType[job.job.targetSelection];
                command.jobStatus = JobStatus[job.job.status];
                command.targets = job.job.targets;
                command.rolloutMaximumPerMinute = job.job.jobExecutionsRolloutConfig.maximumPerMinute;
            }

        } catch (err) {
            logger.debug(`unable to retrieve job: ${err}`);
        }

        try {
            const key = `${this.s3Prefix}${commandId}/files`;
            const params = {
                Bucket: this.s3Bucket,
                Prefix: key
            };
            const uploadedFiles = await this._s3.listObjectsV2(params).promise();
            if (uploadedFiles.Contents && uploadedFiles.Contents.length>0) {
                command.files= {};
                uploadedFiles.Contents.forEach(s3Obj => {
                    const fileId = s3Obj.Key.split(/.*[\/|\\]/).pop();
                    command.files[fileId] = {bucketName:this.s3Bucket, key:s3Obj.Key};
                });
            }
            logger.debug(JSON.stringify(uploadedFiles));
        }  catch (err) {
            logger.debug(`unable to retrieve file listing: ${err}`);
        }

        logger.debug(`commands.service get: exit: command:${JSON.stringify(command)}`);
        return command;

    }

    public async getByJobId(jobId: string):Promise<CommandModel> {
        logger.debug(`commands.service getByJobId: in:commandId:${jobId}`);

        // TODO: improve the performance of this by running the promises in parallel

        const commandByJob = await this.commandsDao.getByJobId(jobId);
        if (commandByJob===undefined) {
            logger.debug('commands.service getByJobId: exit: commandByJob:undefined');
            return commandByJob;
        }

        const command = this.get(commandByJob.commandId);

        logger.debug(`commands.service get: exit: command:${JSON.stringify(command)}`);
        return command;

    }

    public async create(command: CommandModel) : Promise<string> {
        logger.debug(`commands.service create: in: command: ${JSON.stringify(command)}`);

        // TODO validation

        command.commandId = uuid();
        // if the command was created without specifying status then set it to DRAFT
        if (!command.hasOwnProperty('commandStatus')) {
            command.commandStatus = CommandStatus.DRAFT;
        }

        // determine the action to take based on the status
        const actions:WorkflowAction[] = this.workflowFactory.getAction(null, command.commandStatus);

        // perform the actions
        let result=true;

        for (const a of actions) {
            if (a instanceof InvalidTransitionAction) {
                throw new Error('UNSUPPORTED_TRANSITION');
            } else {
                result = result && await a.execute({} as CommandModel, command);
            }
        }

        if (result===false) {
            throw new Error('CREATE_ACTION_FAILED');
        }

        logger.debug(`commands.service create: exit:${command.commandId}`);
        return command.commandId;
    }

    public async update(updated: CommandModel) : Promise<void> {
        logger.debug(`commands.service update: in: command: ${JSON.stringify(updated)}`);

        // retrieve the existing command definition
        const existing = await this.commandsDao.get(updated.commandId);
        if (existing===undefined) {
            throw new Error('NOT_FOUND');
        }
        logger.debug(`commands.service existing: ${JSON.stringify(existing)}`);

        // determine the action to take based on the status
        const actions:WorkflowAction[] = this.workflowFactory.getAction(existing.commandStatus, updated.commandStatus);

        // perform the actions
        let result=true;

        for (const a of actions) {
            if (a instanceof InvalidTransitionAction) {
                throw new Error('UNSUPPORTED_TRANSITION');
            } else {
                result = result && await a.execute(existing, updated);
            }
        }

        if (result===false) {
            throw new Error('UPDATE_FAILED');
        }

        logger.debug(`commands.service update: exit:${result}`);
    }

    public async list(): Promise<CommandListModel> {
        logger.debug('commands.service list: in:');

        // TODO add pagination

        const commands = await this.commandsDao.list();

        logger.debug(`commands.service get: exit: commands:${commands}`);
        return commands;

    }

    public async uploadFile(commandId:string, fileId:string, fileLocation:string): Promise<void> {
        logger.debug(`commands.service uploadFile: in: commandId:${commandId}, fileId:${fileId}, fileLocation:${fileLocation}`);

        const key = `${this.s3Prefix}${commandId}/files/${fileId}`;
        const tags = `commandId=${commandId}&fileId=${fileId}`;

        const writeStream = new stream.PassThrough();
        const readStream = fs.createReadStream(fileLocation);

        readStream.pipe(writeStream);

        try {
            await this._s3.upload({ Bucket:this.s3Bucket, Key:key, Body: writeStream, Tagging: tags }).promise();
            logger.debug('commands.service uploadFile: exit:');
        } catch (err) {
            logger.error(`commands.service uploadFile: err:${err}`);
            throw new Error('FAILED_UPLOAD');
        } finally {
            readStream.close();
            await this._unlinkAsync(fileLocation);
        }

    }

    public async listExecutions(req:ListExecutionsRequest) : Promise<ExecutionSummaryListModel> {
        logger.debug(`commands.service listExecutions: in: req:${JSON.stringify(req)}`);

        const command = await this.get(req.commandId);

        const params = {
             jobId: command.jobId,
             status: req.status,
             maxResults: req.maxResults,
             nextToken: req.nextToken
        };

        try {
            const result = await this._iot.listJobExecutionsForJob(params).promise();
            const executions = result.executionSummaries.map(es=> {
                return {
                    thingName: es.thingArn.split(/.*[\/|\\]/).pop(),
                    executionNumber: es.jobExecutionSummary.executionNumber,
                    status: ExecutionStatus[es.jobExecutionSummary.status],
                };
            });
            const response = {
                results: executions,
                pagination: {
                    maxResults: req.maxResults,
                    nextToken: result.nextToken,
                }
            };
            logger.debug(`commands.service get: listExecutions: response:${response}`);
            return response;
        } catch (err) {
            logger.error(`commands.service get: listExecutions: error:${err}`);
            throw new Error('LIST_EXECUTIONS_FAILED');
        }

    }

    public async getExecution(commandId:string, thingName:string) : Promise<ExecutionModel> {
        logger.debug(`commands.service getExecution: in: commandId:${commandId}, thingName:${thingName}`);

        const command = await this.get(commandId);
        const params = {
            jobId: command.jobId,
            thingName
        };

        try {
            const result = await this._iot.describeJobExecution(params).promise();
            const execution = {
                    thingName,
                    executionNumber: result.execution.executionNumber,
                    status: ExecutionStatus[result.execution.status],
                    lastUpdatedAt: result.execution.lastUpdatedAt,
                    queuedAt: result.execution.queuedAt,
                    startedAt: result.execution.startedAt
            };

            if (result.execution.statusDetails && result.execution.statusDetails.detailsMap) {
                execution['statusDetails'] = result.execution.statusDetails.detailsMap;
            }

            logger.debug(`commands.service getExecution: execution:${execution}`);

            return execution;

        } catch (err) {
            logger.error(`commands.service getExecution: error:${err}`);
            throw new Error('GET_EXECUTION_FAILED');
        }

    }

    public async cancelExecution(commandId:string, thingName:string) : Promise<void> {
        logger.debug(`commands.service cancelExecution: in: commandId:${commandId}, thingName:${thingName}`);

        const command = await this.get(commandId);

        try {
            await this.cancelJobExecutionWrapper(command.jobId, thingName);
            logger.debug('commands.service cancelExecution: exit:');
        } catch (err) {
            logger.error(`commands.service cancelExecution: error:${err}`);
            throw new Error('DELETE_EXECUTION_FAILED');
        }

    }

    /**
     * As AWS IoT has multiple overloaded definitions of cancelJobExecution, we cannot use async/await with it .promise()
     */
    private cancelJobExecutionWrapper(jobId:string, thingName:string) : Promise<void> {
        return new Promise((resolve:any,reject:any) =>  {
            this._iot.cancelJobExecution({jobId, thingName}, (err:any, ___:any) => {
                if(err) {
                    return reject(err);
                }
                return resolve();
            });
        });
    }
}

export class ListExecutionsRequest {
    commandId:string;
    status?:ExecutionStatus;
    maxResults?:number;
    nextToken?:string;
}
