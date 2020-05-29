import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel} from './models';
import {logger} from '../../utils/logger.util';
import { PROVISIONING_CLIENT_TYPES, ThingsService, ProvisionThingRequest, ProvisionThingResponse } from '@cdf/provisioning-client';
import JSZip from 'jszip';
import {S3Utils} from '../../utils/s3.util';
import {TYPES} from '../../di/types';
import ow from 'ow';

@injectable()
export class ProvisionThingHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject('aws.s3.artifacts.bucket') private artifactsBucket: string,
        @inject('aws.s3.artifacts.prefix') private artifactsPrefix: string,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`provisionThing.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow(request?.ggGroup?.Id, ow.string.nonEmpty);
        ow(request?.taskInfo?.devices, ow.array);

        for (const device of request.taskInfo.devices.filter((d=> d.status==='InProgress'))) {

            ow(device.thingName, ow.string.nonEmpty);

            // is the device already registered as a thing?
            const thing = request.things[device.thingName];

            // if it's not provisioned within AWS IoT, we need to provision it
            if (thing===undefined) {

                ow(device.provisioningTemplate, ow.string.nonEmpty);

                device.createdAt = new Date();

                logger.debug(`provisionThing.handler handle: thing:${device.thingName} does not exist`);
                let res: ProvisionThingResponse;
                try {
                    const req: ProvisionThingRequest = {
                        provisioningTemplateId: device.provisioningTemplate,
                        parameters: device.provisioningParameters,
                        cdfProvisioningParameters: device.cdfProvisioningParameters
                    };
                    logger.debug(`provisionThing.handler handle: provisioning:  req:${JSON.stringify(req)}`);
                    res = await this.thingsService.provisionThing(req);
                    logger.debug(`provisionThing.handler handle: provisioning:  res:${JSON.stringify(res)}`);
                } catch (err) {
                    logger.error(`provisionThing.handler handle: provisioning:  err:${err}`);
                    device.status = 'Failure';
                    device.statusMessage = `Failed provisioning: ${err}`;
                    continue;
                }

                // if CDF has created certificates on behalf of the device, we need to store these for later retrieval by the device
                if (res?.certificatePem !== undefined) {
                    try {
                        const [bucket, key] = await this.uploadCerts(request.ggGroup.Id, device.thingName, res.certificatePem, res.privateKey);

                        if(!device.artifacts) {
                            device.artifacts = {};
                        }

                        device.artifacts.certs = {
                            bucket,
                            key,
                            createdAt: new Date()
                        };
                    } catch (err) {
                        logger.error(`provisionThing.handler handle: failed uploading certs:  err:${err}`);
                        device.status = 'Failure';
                        device.statusMessage = `Failed uploading certs: ${err}`;
                        continue;
                    }
                }

            }
        }

        logger.debug(`provisionThing.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

    private async uploadCerts(groupId:string, deviceId:string, certificate:string, privateKey?:string): Promise<[string,string]> {
        logger.debug(`provisionThing.handler handle: in: groupId:${groupId}, deviceId:${deviceId}`);

        const jsZip = new JSZip();
        const certsZip = jsZip.folder('certs');
        certsZip.file(`cert.pem`, certificate);

        if (privateKey) {
            certsZip.file(`private.key`, privateKey);
        }

        const s3Key = `${this.artifactsPrefix}${groupId}/${deviceId}/certs.zip`;
        const zipStream = certsZip.generateNodeStream({type: 'nodebuffer', streamFiles:true});
        await this.s3Utils.uploadStreamToS3(this.artifactsBucket, s3Key, zipStream);

        logger.debug(`provisionThing.handler handle: exit: bucket:${this.artifactsBucket}, key:${s3Key}`);
        return [this.artifactsBucket, s3Key];
    }

}
