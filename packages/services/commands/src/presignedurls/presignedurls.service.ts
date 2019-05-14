/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger';
import { PresignedUploadRequestModel, PresignedDownloadRequestModel, PresignedResponseModel, PresignedResponseStatusType } from './presignedurls.models';
import ow from 'ow';
import { CommandsService } from '../commands/commands.service';
import { TemplatesService } from '../templates/templates.service';
import { CommandModel } from '../commands/commands.models';
import { TemplateModel } from '../templates/templates.models';
import { Iot } from 'aws-sdk';

@injectable()
export class PresignedUrlsService {

    private _iot: AWS.Iot;
    private _iotData: AWS.IotData;
    private _s3: AWS.S3;

    constructor(
        @inject('aws.s3.bucket') private s3Bucket: string,
        @inject('aws.s3.prefix') private s3Prefix: string,
        @inject('mqtt.topics.presigned') private presignedTopic: string,
        @inject(TYPES.CommandsService) private commandService: CommandsService,
        @inject(TYPES.TemplatesService) private templateService: TemplatesService,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot,
        @inject(TYPES.IotDataFactory) iotDataFactory: () => AWS.IotData,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3 ) {
            this._iot = iotFactory();
            this._iotData = iotDataFactory();
            this._s3 = s3Factory();
    }

    public async generateForUpload(request: PresignedUploadRequestModel) : Promise<PresignedResponseModel> {
        logger.debug(`presignedurls.service generateForUpload: in: model: ${JSON.stringify(request)}`);

        const r:PresignedResponseModel = {
            thingName:request.thingName,
            commandId:request.commandId,
            status:PresignedResponseStatusType.SUCCESS
        };

        try {
            // validation
            ow(request, ow.object.nonEmpty);
            ow(request.thingName, ow.string.nonEmpty);
            ow(request.requestedObjectKeys, ow.object.nonEmpty);

            // get the data we need
            const info = await this.getCommandAndJobInfo(request.commandId);
            const command = info[0];
            const template = info[1];
            const jobResponse = info[2];

            // security check:  is device part of command?
            const isTarget = await this.validateDeviceIsTarget(request.thingName, jobResponse);
            if (!isTarget) {
                throw new Error('FORBIDDEN');
            }

            // generate presigned urls
            const presignedUrls:{ [key: string] : string} = {};
            request.requestedObjectKeys.forEach(k=> {
                const key = `${this.s3Prefix}commands/${command.commandId}/uploads/${request.thingName}/${k}`;
                const presignedUrl = this.generatePresignedUrl(this.s3Bucket, key, template.presignedUrlExpiresInSeconds, true);
                presignedUrls[k] = presignedUrl;
            });
            r.presignedUrls = presignedUrls;

            // publish over MQTT
            await this.publishSuccessResponse(r, 'uploads');

        } catch (err) {
            logger.error(`presignedurls.service generateForUpload: error:${err}`);
            r.status=PresignedResponseStatusType.FAILED;
            await this.publishFailedResponse(r, 'uploads');
        }

        logger.debug(`presignedurls.service generateForUpload: exit:${JSON.stringify(r)}`);
        return r;
    }

    public async generateForDownload(request: PresignedDownloadRequestModel) : Promise<PresignedResponseModel> {
        logger.debug(`presignedurls.service generateForDownload: in: model: ${JSON.stringify(request)}`);

        const r:PresignedResponseModel = {
            thingName:request.thingName,
            commandId:request.commandId,
            status:PresignedResponseStatusType.SUCCESS
        };

        try {
            // validation
            ow(request, ow.object.nonEmpty);
            ow(request.thingName, ow.string.nonEmpty);
            ow(request.requestedFileAliases, ow.object.nonEmpty);

            // get the data we need
            const info = await this.getCommandAndJobInfo(request.commandId);
            const command = info[0];
            const template = info[1];
            const jobResponse = info[2];

            // security check:  is device part of command?
            const isTarget = await this.validateDeviceIsTarget(request.thingName, jobResponse);
            if (!isTarget) {
                throw new Error('FORBIDDEN');
            }

            // generate presigned urls
            const presignedUrls:{ [key: string] : string} = {};
            request.requestedFileAliases.forEach(k=> {

                // security check: is alias part of template?
                if (!template.requiredFiles.includes(k)) {
                    throw new Error('INVALID_ALIAS: ' + k);
                }

                // pre-sign the url
                const key = command.files[k].key;
                const presignedUrl = this.generatePresignedUrl(command.files[k].bucketName, key, template.presignedUrlExpiresInSeconds, false);
                presignedUrls[k] = presignedUrl;
            });
            r.presignedUrls = presignedUrls;

            // publish over MQTT
            await this.publishSuccessResponse(r, 'downloads');

        } catch (err) {
            logger.error(`presignedurls.service generateForDownload: error:${err}`);
            r.status=PresignedResponseStatusType.FAILED;
            await this.publishFailedResponse(r, 'uploads');
        }

        logger.debug(`presignedurls.service generateForDownload: exit:${JSON.stringify(r)}`);
        return r;
    }

    private async getCommandAndJobInfo(commandId:string): Promise<[CommandModel, TemplateModel, Iot.Job]> {
        logger.debug(`presignedurls.service getCommandAndJobInfo: in: commandId: ${commandId}`);

        const command = await this.commandService.get(commandId);

        const jobFuture = this._iot.describeJob({jobId:command.jobId}).promise();
        const templateFuture = this.templateService.get(command.templateId);
        const results = await Promise.all([jobFuture, templateFuture]);

        const job = results[0].job;
        const template = results[1];

        logger.debug(`presignedurls.service getCommandAndJobInfo: exit: command: ${JSON.stringify(command)}, template: ${JSON.stringify(template)}, job: ${JSON.stringify(job)}`);
        return [command, template, job];
    }

    private async publishSuccessResponse(r:PresignedResponseModel, direction:string) : Promise<void> {
        logger.debug(`presignedurls.service publishSuccessResponse: in: r:${JSON.stringify(r)}, direction:${direction}`);

        // cdf/commands/presignedurl/{commandId}/{thingName}/{direction}/accepted
        const topic = this.presignedTopic.replace('{commandId}', r.commandId)
            .replace('{thingName}', r.thingName)
            .replace('{direction}', direction)
            + '/accepted';

        logger.debug(`presignedurls.service publishSuccessResponse: topic:${topic}`);

        const params = {
            topic,
            payload: JSON.stringify(r),
            qos: 1
        };

        await this._iotData.publish(params).promise();
        logger.debug('presignedurls.service publishSuccessResponse: exit:');

    }

    private async publishFailedResponse( r:PresignedResponseModel, direction:string) : Promise<void> {
        logger.debug(`presignedurls.service publishSuccessResponse: in: r:${JSON.stringify(r)}, direction:${direction}`);

        // cdf/commands/presignedurl/{commandId}/{thingName}/{direction}/rejected
        const topic = this.presignedTopic.replace('{commandId}', r.commandId)
            .replace('{thingName}', r.thingName)
            .replace('{direction}', direction)
            + '/rejected';

        logger.debug(`presignedurls.service publishSuccessResponse: topic:${topic}`);

        const params = {
            topic,
            payload: JSON.stringify(r),
            qos: 1
        };

        await this._iotData.publish(params).promise();
        logger.debug('presignedurls.service publishSuccessResponse: exit:');
    }

    private generatePresignedUrl(bucketName:string, key:string, presignedUrlExpiresInSeconds:number, forUpload:boolean) : string {
        logger.debug(`presignedurls.service generatePresignedUrl: in: bucketName:${bucketName}, key:${key}, presignedUrlExpiresInSeconds:${presignedUrlExpiresInSeconds}`);
        const params = {
            Bucket: bucketName,
            Key: key,
            Expires: presignedUrlExpiresInSeconds

        };
        const operation = forUpload? 'putObject' : 'getObject';
        const signedUrl = this._s3.getSignedUrl(operation, params);
        logger.debug(`presignedurls.service generatePresignedUrl: exit: signedUrl:${signedUrl}`);
        return signedUrl;
    }

    private async validateDeviceIsTarget(thingName:string, job:Iot.Job) : Promise<boolean> {
        logger.debug(`presignedurls.service validateDeviceIsTarget: in: thingName:${thingName}, job:${JSON.stringify(job)}`);

        if (job===undefined || job===null) {
            throw new Error('NOT_FOUND');
        }

        let isTarget=false;
        // does the device explictly exist as a target?
        if (job.targets.filter(t=> t.split(':').pop()===`thing/${thingName}`).length>0) {
            isTarget=true;
        }
        // if not, see if it is implicitly targetted via a group
        if (!isTarget) {
            const thing = await this._iot.listThingGroupsForThing({thingName}).promise();
            const groups = job.targets.filter(t=> t.split(':').pop().startsWith('group/'));
            if (thing.thingGroups && thing.thingGroups.length>0 && groups && groups.length>0) {
                for(const g of groups) {
                    const match = (thing.thingGroups.filter(tg=> tg.groupArn===g).length>0);
                    if (match) {
                        isTarget=true;
                        break;
                    }
                }
            }
        }

        logger.debug(`presignedurls.service validateDeviceIsTarget: exit:${isTarget}`);
        return isTarget;
    }

}
