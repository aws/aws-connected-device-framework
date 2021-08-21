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
import {DeviceTaskSummary} from '../devices.models';
import {GroupItem} from '../../groups/groups.models';
import AWS = require('aws-sdk');
import { TemplateItem } from '../../templates/templates.models';

export class DeviceAssociationModel {

    // original task
    taskInfo: DeviceTaskSummary;

    // greengrass info
    group: GroupItem;
    ggGroup: AWS.Greengrass.GetGroupResponse;
    ggCoreVersion: AWS.Greengrass.CoreDefinitionVersion;
    ggDeviceVersion: AWS.Greengrass.DeviceDefinitionVersion;
    ggGroupVersion: AWS.Greengrass.GroupVersion;

    // template info
    template: TemplateItem;

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
