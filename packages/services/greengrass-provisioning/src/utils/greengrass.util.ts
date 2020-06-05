/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from './logger.util';
import { TYPES } from '../di/types';
import ow from 'ow';

@injectable()
export class GreengrassUtils {

    private gg: AWS.Greengrass;

    public constructor(
        @inject('aws.accountId') private accountId:string,
        @inject('aws.region') private region:string,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass
    ) {
        this.gg = greengrassFactory();
    }

    public async getSubscriptionInfo(subscriptionDefinitionVersionArn: string) : Promise<AWS.Greengrass.SubscriptionDefinitionVersion> {
        logger.debug(`greengrass.util getSubscriptionInfo: in: subscriptionDefinitionVersionArn:${subscriptionDefinitionVersionArn}`);

        let subscriptionInfo: AWS.Greengrass.SubscriptionDefinitionVersion = {
            Subscriptions: []
        };
        if (subscriptionDefinitionVersionArn) {
            const [defId, versionId] = this.extractDefIdVersionFromArn(subscriptionDefinitionVersionArn);
            try {
                const r = await this.gg.getSubscriptionDefinitionVersion({
                    SubscriptionDefinitionId: defId,
                    SubscriptionDefinitionVersionId: versionId
                }).promise();
                subscriptionInfo = r.Definition;
                // TODO: handle pagination
            } catch (err) {
                // TODO handle
                logger.error(`greengrass.util getSubscriptionInfo: err:${err}`);
                throw err;
            }
        }

        logger.debug(`greengrass.util getSubscriptionInfo: exit: ${JSON.stringify(subscriptionInfo)}`);
        return subscriptionInfo;
    }

    public async createSubscriptionDefinitionVersion(currentSubscriptionDefinitionVersionArn:string, updatedDefinition:AWS.Greengrass.SubscriptionDefinitionVersion) : Promise<string> {
        logger.debug(`greengrass.util createSubscriptionDefinitionVersion: in: createSubscriptionInfoVersion:${currentSubscriptionDefinitionVersionArn}, updatedDefinition:${JSON.stringify(updatedDefinition)}`);

        let defId : string;
        let versionId: string;

        try {
            if (currentSubscriptionDefinitionVersionArn===undefined) {
                // need to create a new definition
                const res = await this.gg.createSubscriptionDefinition({
                    Name: 'subscriptions',
                    InitialVersion: updatedDefinition
                }).promise();
                defId = res.Id;
                versionId = res.LatestVersion;
            } else {
                [defId, versionId] = this.extractDefIdVersionFromArn(currentSubscriptionDefinitionVersionArn);
                const res = await this.gg.createSubscriptionDefinitionVersion({
                    SubscriptionDefinitionId: defId,
                    Subscriptions: updatedDefinition.Subscriptions
                }).promise();
                versionId = res.Version;
            }
        } catch (err) {
            // TODO handle
            logger.error(`greengrass.util createSubscriptionDefinitionVersion: err:${err}`);
            throw err;
        }

        const arn = `arn:aws:greengrass:${this.region}:${this.accountId}:/greengrass/definition/subscriptions/${defId}/versions/${versionId}`;
        logger.debug(`greengrass.util createSubscriptionDefinitionVersion: exit: ${arn}`);
        return arn;
    }

    public async getDeviceInfo(deviceDefinitionVersionArn: string) : Promise<AWS.Greengrass.DeviceDefinitionVersion> {
        logger.debug(`greengrass.util getDeviceInfo: in: deviceDefinitionVersionArn:${deviceDefinitionVersionArn}`);

        let devicesInfo: AWS.Greengrass.DeviceDefinitionVersion = {
            Devices: []
        };
        if (deviceDefinitionVersionArn) {
            const [defId, versionId] = this.extractDefIdVersionFromArn(deviceDefinitionVersionArn);
            try {
                const r = await this.gg.getDeviceDefinitionVersion({
                    DeviceDefinitionId: defId,
                    DeviceDefinitionVersionId: versionId
                }).promise();
                devicesInfo = r.Definition;
                // TODO: handle pagination
            } catch (err) {
                // TODO handle
                logger.error(`greengrass.util getDeviceInfo: err:${err}`);
                throw err;
            }
        }

        logger.debug(`greengrass.util getDeviceInfo: exit: ${JSON.stringify(devicesInfo)}`);
        return devicesInfo;
    }

    public async createDeviceDefinitionVersion(currentDeviceDefinitionVersionArn:string, updatedDefinition:AWS.Greengrass.DeviceDefinitionVersion) : Promise<string> {
        logger.debug(`greengrass.util createDeviceDefinitionVersion: in: createDeviceInfoVersion:${currentDeviceDefinitionVersionArn}, updatedDefinition:${JSON.stringify(updatedDefinition)}`);

        let defId : string;
        let versionId: string;

        try {
            if (currentDeviceDefinitionVersionArn===undefined) {
                // need to create a new definition
                const res = await this.gg.createDeviceDefinition({
                    Name: 'devices',
                    InitialVersion: updatedDefinition
                }).promise();
                defId = res.Id;
                versionId = res.LatestVersion;
            } else {
                [defId, versionId] = this.extractDefIdVersionFromArn(currentDeviceDefinitionVersionArn);
                const res = await this.gg.createDeviceDefinitionVersion({
                    DeviceDefinitionId: defId,
                    Devices: updatedDefinition.Devices
                }).promise();
                versionId = res.Version;
            }
        } catch (err) {
            // TODO handle
            logger.error(`greengrass.util createDeviceDefinitionVersion: err:${err}`);
            throw err;
        }

        const arn = `arn:aws:greengrass:${this.region}:${this.accountId}:/greengrass/definition/devices/${defId}/versions/${versionId}`;
        logger.debug(`greengrass.util createDeviceDefinitionVersion: exit: ${arn}`);
        return arn;
    }

    public async getCoreInfo(coreDefinitionVersionArn: string) : Promise<AWS.Greengrass.CoreDefinitionVersion> {
        logger.debug(`greengrass.util getCoreInfo: in: coreDefinitionVersionArn:${coreDefinitionVersionArn}`);

        let coreInfo: AWS.Greengrass.CoreDefinitionVersion = {
            Cores: []
        };
        if (coreDefinitionVersionArn) {
            const [defId, versionId] = this.extractDefIdVersionFromArn(coreDefinitionVersionArn);
            try {
                const r = await this.gg.getCoreDefinitionVersion({
                    CoreDefinitionId: defId,
                    CoreDefinitionVersionId: versionId
                }).promise();
                coreInfo = r.Definition;
            } catch (err) {
                // TODO handle
                logger.error(`greengrass.util getCoreInfo: err:${err}`);
                throw err;
            }
        }

        logger.debug(`greengrass.util getCoreInfo: exit: ${JSON.stringify(coreInfo)}`);
        return coreInfo;
    }

    public async createCoreDefinitionVersion(currentCoreDefinitionVersionArn:string, updatedDefinition:AWS.Greengrass.CoreDefinitionVersion) : Promise<string> {
        logger.debug(`greengrass.util createCoreDefinitionVersion: in: currentCoreDefinitionVersionArn:${currentCoreDefinitionVersionArn}, updatedDefinition:${JSON.stringify(updatedDefinition)}`);

        let defId : string;
        let versionId: string;

        try {
            if (currentCoreDefinitionVersionArn===undefined) {
                // need to create a new definition
                const res = await this.gg.createCoreDefinition({
                    Name: 'cores',
                    InitialVersion: updatedDefinition
                }).promise();
                defId = res.Id;
                versionId = res.LatestVersion;
            } else {
                [defId, versionId] = this.extractDefIdVersionFromArn(currentCoreDefinitionVersionArn);
                const res = await this.gg.createCoreDefinitionVersion({
                    CoreDefinitionId: defId,
                    Cores: updatedDefinition.Cores
                }).promise();
                versionId = res.Version;
            }
        } catch (err) {
            // TODO handle
            logger.error(`greengrass.util createCoreDefinitionVersion: err:${err}`);
            throw err;
        }

        const arn = `arn:aws:greengrass:${this.region}:${this.accountId}:/greengrass/definition/cores/${defId}/versions/${versionId}`;
        logger.debug(`greengrass.util createCoreDefinitionVersion: exit: ${arn}`);
        return arn;
    }

    public async getGroupVersionInfo(groupId: string, groupVersionId: string) : Promise<AWS.Greengrass.GroupVersion> {
        logger.debug(`greengrass.util getGroupVersionInfo: in: groupId:${groupId}, groupVersionId:${groupVersionId}`);

        let versionInfo: AWS.Greengrass.GroupVersion;
        try {
            const r = await this.gg.getGroupVersion({
                GroupId: groupId,
                GroupVersionId: groupVersionId
            }).promise();
            versionInfo = r.Definition;
        } catch (err) {
            // TODO handle
                logger.error(`greengrass.util getGroupVersionInfo: err:${err}`);
                throw err;
        }
        logger.debug(`greengrass.util getGroupVersionInfo: exit: ${JSON.stringify(versionInfo)}`);
        return versionInfo;
    }

    public async createGroupVersion(groupId:string, groupVersion:AWS.Greengrass.GroupVersion, coreDefinitionVersionArn:string, deviceDefinitionVersionArn:string,
        subscriptionsDefinitionVersionArn:string) : Promise<string> {
        logger.debug(`greengrass.util createGroupVersion: in: groupId:${groupId}, groupVersion:${JSON.stringify(groupVersion)}, coreDefinitionVersionArn:${coreDefinitionVersionArn}, deviceDefinitionVersionArn:${deviceDefinitionVersionArn}, subscriptionsDefinitionVersionArn:${subscriptionsDefinitionVersionArn}`);

        let versionId: string;

        try {
            const req:AWS.Greengrass.CreateGroupVersionRequest = {
                GroupId: groupId,
                ConnectorDefinitionVersionArn: groupVersion?.ConnectorDefinitionVersionArn,
                CoreDefinitionVersionArn:  coreDefinitionVersionArn ?? groupVersion?.CoreDefinitionVersionArn,
                DeviceDefinitionVersionArn:  deviceDefinitionVersionArn ?? groupVersion?.DeviceDefinitionVersionArn,
                FunctionDefinitionVersionArn: groupVersion?.FunctionDefinitionVersionArn,
                LoggerDefinitionVersionArn: groupVersion?.LoggerDefinitionVersionArn,
                ResourceDefinitionVersionArn: groupVersion?.ResourceDefinitionVersionArn,
                SubscriptionDefinitionVersionArn: subscriptionsDefinitionVersionArn ?? groupVersion?.SubscriptionDefinitionVersionArn
            };

            const res = await this.gg.createGroupVersion(req).promise();
            versionId = res.Version;
        } catch (err) {
            // TODO handle
            logger.error(`greengrass.util createGroupVersion: err:${err}`);
            throw err;
        }

        logger.debug(`greengrass.util createGroupVersion: exit: ${versionId}`);
        return versionId;
    }

    public async getGroupInfo(groupId: string) : Promise<AWS.Greengrass.GetGroupResponse> {
        logger.debug(`greengrass.util getGroupInfo: in: groupId:${groupId}`);
        let res: AWS.Greengrass.GetGroupResponse;
        try {
            res = await this.gg.getGroup({
                GroupId: groupId
            }).promise();
            if (res===undefined) {
                throw new Error('NOT_FOUND');
            }
        } catch (err) {
            // TODO handle
            logger.error(`greengrass.util getGroupInfo: err:${err}`);
            throw err;
        }
        logger.debug(`greengrass.util getGroupInfo: exit: ${JSON.stringify(res)}`);
        return res;
    }

    private extractDefIdVersionFromArn(arn:string) : [string,string] {
        logger.debug(`devices.service extractDefIdVersionFromArn: in: arn:${arn}`);

        ow(arn, ow.string.nonEmpty);
        const resource = arn.substring( arn.lastIndexOf(':'));
        ow(resource, ow.string.nonEmpty);
        const components = resource.split('/');
        ow(components, ow.array.minLength(5));

        const defId = components[components.length-3];
        const versionId =  components[components.length-1];

        logger.debug(`devices.service extractDefIdVersionFromArn: exit: defId:${defId}, versionId:${versionId}`);

        return [defId, versionId];
    }
}
