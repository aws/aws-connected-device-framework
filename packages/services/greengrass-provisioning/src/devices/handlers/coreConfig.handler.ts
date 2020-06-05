import { injectable, inject } from 'inversify';
import {AbstractDeviceAssociationHandler} from './handler';
import {DeviceAssociationModel, GreengrassConfig} from './models';
import {logger} from '../../utils/logger.util';
import JSZip from 'jszip';
import {S3Utils} from '../../utils/s3.util';
import {TYPES} from '../../di/types';
import ow from 'ow';

@injectable()
export class CoreConfigHandler extends AbstractDeviceAssociationHandler {

    constructor(
        @inject('aws.iot.endpoint') private iotEndpoint: string,
        @inject('aws.region') private region: string,
        @inject('aws.s3.artifacts.bucket') private artifactsBucket: string,
        @inject('aws.s3.artifacts.prefix') private artifactsPrefix: string,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils,) {
        super();
    }

    public async handle(request: DeviceAssociationModel): Promise<DeviceAssociationModel> {
        logger.debug(`coreConfig.handler handle: in: request:${JSON.stringify(request)}`);

        ow(request?.taskInfo?.status, ow.string.nonEmpty);

        if (request.taskInfo.status==='Failure') {
            return super.handle(request);
        }

        ow(request?.ggGroup?.Id, ow.string.nonEmpty);
        ow(request?.taskInfo?.devices, ow.array);

        for (const device of request.taskInfo.devices.filter((d=> d.type==='core'))) {

            ow(device.thingName, ow.string.nonEmpty);

            const thing = request.things[device.thingName];

            const config:GreengrassConfig = {
                coreThing: {
                    caPath: 'root.ca.pem',
                    certPath: 'cert.pem',
                    keyPath: 'private.key',
                    thingArn: thing.thingArn,
                    iotHost: this.iotEndpoint,
                    ggHost: `greengrass-ats.iot.${this.region}.amazonaws.com`
                },
                runtime: {
                    cgroup: {
                        useSystemd: 'yes'
                    }
                },
                managedRespawn: false,
                crypto : {
                    principals : {
                        SecretsManager : {
                            privateKeyPath : 'file:///greengrass/certs/private.key'
                        },
                        IoTCertificate : {
                            privateKeyPath: 'file:///greengrass/certs/private.key',
                            certificatePath : 'file:///greengrass/certs/cert.pem'
                        }
                    },
                    caPath : 'file:///greengrass/certs/root.ca.pem'
                }
            };

            try {
                const [bucket, key] = await this.uploadConfig(request.ggGroup.Id, device.thingName, JSON.stringify(config));

                if(!device.artifacts) {
                    device.artifacts = {};
                }

                device.artifacts.config = {
                    bucket,
                    key,
                    createdAt: new Date()
                };
            } catch (err) {
                logger.error(`coreConfig.handler handle: failed uploading config:  err:${err}`);
                device.status = 'Failure';
                device.statusMessage = `Failed uploading config: ${err}`;
                continue;
            }

        }

        logger.debug(`coreConfig.handler handle: request:${JSON.stringify(request)}`);
        return super.handle(request);
    }

    private async uploadConfig(groupId:string, deviceId:string, config:string): Promise<[string,string]> {
        logger.debug(`coreConfig.handler uploadConfig: in: groupId:${groupId}, deviceId:${deviceId}, config:${config}`);

        const jsZip = new JSZip();
        const certsZip = jsZip.folder('config');
        certsZip.file(`config.json`, config);

        const s3Key = `${this.artifactsPrefix}${groupId}/${deviceId}/greengrassCoreConfig.zip`;
        const zipStream = certsZip.generateNodeStream({type: 'nodebuffer', streamFiles:true});
        await this.s3Utils.uploadStreamToS3(this.artifactsBucket, s3Key, zipStream);

        logger.debug(`coreConfig.handler uploadConfig: exit: bucket:${this.artifactsBucket}, key:${s3Key}`);
        return [this.artifactsBucket, s3Key];
    }

}
