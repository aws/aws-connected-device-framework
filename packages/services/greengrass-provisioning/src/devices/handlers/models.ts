import {DeviceTaskSummary} from '../devices.models';
import {GroupItem} from '../../groups/groups.models';
import AWS = require('aws-sdk');

export class DeviceAssociationModel {

    // original task
    taskInfo: DeviceTaskSummary;

    // greengrass info
    group: GroupItem;
    ggGroup: AWS.Greengrass.GetGroupResponse;
    ggCoreVersion: AWS.Greengrass.CoreDefinitionVersion;
    ggDeviceVersion: AWS.Greengrass.DeviceDefinitionVersion;
    ggGroupVersion: AWS.Greengrass.GroupVersion;

    // thing info
    things?: {[thingName: string] : AWS.Iot.DescribeThingResponse}= {};
    certificateArns?: {[thingName: string] : string}= {};

    updatedGroupVersionId?:string;

}

export class GreengrassConfig {
    coreThing: {
        caPath:string;
        certPath:string;
        keyPath:string;
        thingArn:string;
        iotHost:string;
        ggHost:string;
        iotMqttPort?: number;
        iotHttpPort?: number;
        ggMqttPort?: number;
        ggHttpPort?: number;
        keepAlive?:number;
        networkProxy?: string;
    };
    runtime: {
        maxWorkItemCount?: number;
        postStartHealthCheckTimeout?: number;
        cgroup: {
            useSystemd: string;
        }
    };
    crypto: {
        PKCS11?: {
            OpenSSLEngine?: string;
            P11Provider: string;
            slotLabel: string;
            slotUserPin: string;
        };
        principals: {
            IoTCertificate: {
                privateKeyPath: string;
                certificatePath: string;
            };
            MQTTServerCertificate?: {
                privateKeyPath: string;
            };
            SecretsManager: {
                privateKeyPath: string;
            };
        };
        caPath: string;
    };
    managedRespawn?: boolean;
    mqttMaxConnectionRetryInterval?: number;
    writeDirectory?: string;
}
