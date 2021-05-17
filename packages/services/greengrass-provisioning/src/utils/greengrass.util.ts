/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { injectable, inject } from 'inversify';
import {logger} from './logger.util';
import { TYPES } from '../di/types';
import ow from 'ow';
import { __listOfCore, __listOfDevice } from 'aws-sdk/clients/greengrass';
import pLimit from 'p-limit';

@injectable()
export class GreengrassUtils {

    private gg: AWS.Greengrass;
    private iot: AWS.Iot;

    public constructor(
        @inject('aws.accountId') private accountId:string,
        @inject('aws.region') private region:string,
        @inject('defaults.promisesConcurrency') private promisesConcurrency:number,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass,
        @inject(TYPES.IotFactory) iotFactory: () => AWS.Iot
    ) {
        this.gg = greengrassFactory();
        this.iot = iotFactory();
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
            logger.error(`greengrass.util createCoreDefinitionVersion: err:${err}`);
            throw err;
        }

        const arn = `arn:aws:greengrass:${this.region}:${this.accountId}:/greengrass/definition/cores/${defId}/versions/${versionId}`;
        logger.debug(`greengrass.util createCoreDefinitionVersion: exit: ${arn}`);
        return arn;
    }


    public async getFunctionInfo(functionDefinitionVersionArn: string) : Promise<AWS.Greengrass.FunctionDefinitionVersion> {
        logger.debug(`greengrass.util getFunctionInfo: in: functionDefinitionVersionArn:${functionDefinitionVersionArn}`);

        let functionInfo: AWS.Greengrass.FunctionDefinitionVersion = {
            Functions: []
        };
        if (functionDefinitionVersionArn) {
            const [defId, versionId] = this.extractDefIdVersionFromArn(functionDefinitionVersionArn);
            try {
                const r = await this.gg.getFunctionDefinitionVersion({
                    FunctionDefinitionId: defId,
                    FunctionDefinitionVersionId: versionId
                }).promise();
                functionInfo = r.Definition;
            } catch (err) {
                logger.error(`greengrass.util getFunctionInfo: err:${err}`);
                throw err;
            }
        }

        logger.debug(`greengrass.util getFunctionInfo: exit: ${JSON.stringify(functionInfo)}`);
        return functionInfo;
    }

    public async createFunctionDefinitionVersion(currentFunctionDefinitionVersionArn:string, updatedDefinition:AWS.Greengrass.FunctionDefinitionVersion) : Promise<string> {
        logger.debug(`greengrass.util createFunctionDefinitionVersion: in: currentFunctionDefinitionVersionArn:${currentFunctionDefinitionVersionArn}, updatedDefinition:${JSON.stringify(updatedDefinition)}`);

        let defId : string;
        let versionId: string;

        try {
            if (currentFunctionDefinitionVersionArn===undefined) {
                // need to create a new definition
                const res = await this.gg.createFunctionDefinition({
                    Name: 'functions',
                    InitialVersion: updatedDefinition
                }).promise();
                defId = res.Id;
                versionId = res.LatestVersion;
            } else {
                [defId, versionId] = this.extractDefIdVersionFromArn(currentFunctionDefinitionVersionArn);
                const res = await this.gg.createFunctionDefinitionVersion({
                    FunctionDefinitionId: defId,
                    Functions: updatedDefinition.Functions
                }).promise();
                versionId = res.Version;
            }
        } catch (err) {
            logger.error(`greengrass.util createFunctionDefinitionVersion: err:${err}`);
            throw err;
        }

        const arn = `arn:aws:greengrass:${this.region}:${this.accountId}:/greengrass/definition/functions/${defId}/versions/${versionId}`;
        logger.debug(`greengrass.util createFunctionDefinitionVersion: exit: ${arn}`);
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
            logger.error(`greengrass.util getGroupVersionInfo: err:${err}`);
            throw err;
        }
        logger.debug(`greengrass.util getGroupVersionInfo: exit: ${JSON.stringify(versionInfo)}`);
        return versionInfo;
    }

    public async createGroupVersion(groupId:string, groupVersion:AWS.Greengrass.GroupVersion, functionDefinitionVersionArn:string, coreDefinitionVersionArn:string,
        deviceDefinitionVersionArn:string, subscriptionsDefinitionVersionArn:string) : Promise<string> {
        logger.debug(`greengrass.util createGroupVersion: in: groupId:${groupId}, groupVersion:${JSON.stringify(groupVersion)}, functionDefinitionVersionArn:${functionDefinitionVersionArn}, coreDefinitionVersionArn:${coreDefinitionVersionArn}, deviceDefinitionVersionArn:${deviceDefinitionVersionArn}, subscriptionsDefinitionVersionArn:${subscriptionsDefinitionVersionArn}`);

        let versionId: string;

        try {
            const req:AWS.Greengrass.CreateGroupVersionRequest = {
                GroupId: groupId,
                ConnectorDefinitionVersionArn: groupVersion?.ConnectorDefinitionVersionArn,
                CoreDefinitionVersionArn:  coreDefinitionVersionArn ?? groupVersion?.CoreDefinitionVersionArn,
                DeviceDefinitionVersionArn:  deviceDefinitionVersionArn ?? groupVersion?.DeviceDefinitionVersionArn,
                FunctionDefinitionVersionArn: functionDefinitionVersionArn ?? groupVersion?.FunctionDefinitionVersionArn,
                LoggerDefinitionVersionArn: groupVersion?.LoggerDefinitionVersionArn,
                ResourceDefinitionVersionArn: groupVersion?.ResourceDefinitionVersionArn,
                SubscriptionDefinitionVersionArn: subscriptionsDefinitionVersionArn ?? groupVersion?.SubscriptionDefinitionVersionArn
            };

            const res = await this.gg.createGroupVersion(req).promise();
            versionId = res.Version;
        } catch (err) {
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
            logger.error(`greengrass.util getGroupInfo: err:${err}`);
            throw err;
        }
        logger.debug(`greengrass.util getGroupInfo: exit: ${JSON.stringify(res)}`);
        return res;
    }

    private extractDefIdVersionFromArn(arn:string) : [string,string] {
        logger.debug(`greengrass.util extractDefIdVersionFromArn: in: arn:${arn}`);

        ow(arn, ow.string.nonEmpty);
        const resource = arn.substring( arn.lastIndexOf(':'));
        ow(resource,'resource', ow.string.nonEmpty);
        const components = resource.split('/');
        ow(components, ow.array.minLength(5));

        const defId = components[components.length-3];
        const versionId =  components[components.length-1];

        logger.debug(`greengrass.util extractDefIdVersionFromArn: exit: defId:${defId}, versionId:${versionId}`);

        return [defId, versionId];
    }

    public async processFunctionEnvVarTokens(functionCache:FunctionDefEnvVarExpansionMap, functionDefinitionVersionArn:string,
        coreDefinitionVersionArn: string) : Promise<string> {

        logger.debug(`greengrass.util processFunctionEnvVarTokens: in: functionCache:${JSON.stringify(functionCache)}, functionDefinitionVersionArn: ${functionDefinitionVersionArn}, coreDefinitionVersionArn: ${coreDefinitionVersionArn}`);

        // lambda env vars may contain tokens to be expanded. if they do, they need to be unique to the 
        // greengrass group instead of associating the exact same version as defined in the template
        let requiresFunctionEnvVarExpansion = functionCache[functionDefinitionVersionArn]?.isRequired;
        if (requiresFunctionEnvVarExpansion===undefined) {
            const functionDef = await this.getFunctionInfo(functionDefinitionVersionArn);
            functionCache[functionDefinitionVersionArn] = {
                isRequired: this.isFunctionEnvVarExpansionRequired(functionDef),
                def: functionDef
            } 
            requiresFunctionEnvVarExpansion = functionCache[functionDefinitionVersionArn].isRequired;
        }
        if (!requiresFunctionEnvVarExpansion) {
            return functionDefinitionVersionArn;
        }

        let expandedFunctionDefinitionVersionArn:string;
        const core = (await this.getCoreInfo(coreDefinitionVersionArn))?.Cores?.[0];   
        if (core!==undefined) {
            const coreName = core.ThingArn.split('/')[1];    
            const thing = (await this.getThings([core]))?.[coreName];
            if (thing!==undefined) {
                const updatedFunctionDef = this.expandFunctionEnvVars(
                    functionCache[functionDefinitionVersionArn].def,
                    thing.thingName, thing.thingTypeName, thing.thingArn);
                // explictly not passing in current version arn to force an entirely separate one to be created
                expandedFunctionDefinitionVersionArn = await this.createFunctionDefinitionVersion(undefined, updatedFunctionDef);
            }
        }

        const arn = expandedFunctionDefinitionVersionArn ?? functionDefinitionVersionArn;
        logger.debug(`greengrass.util processFunctionEnvVarTokens: exit:${arn}`);
        return arn;
    }

    private expandFunctionEnvVars(existing: AWS.Greengrass.FunctionDefinitionVersion, coreThingName:string, coreThingType:string, coreThingArn:string):AWS.Greengrass.FunctionDefinitionVersion {
        logger.debug(`greengrass.util expandFunctionEnvVars: in: existing:${JSON.stringify(existing)}, coreThingName"${coreThingName}, coreThingType:${coreThingType}, coreThingArn:${coreThingArn}`);
        const updated: AWS.Greengrass.FunctionDefinitionVersion = Object.assign({}, existing);
        updated.Functions?.forEach(f=> {
            if (f.FunctionConfiguration?.Environment?.Variables!==undefined) {
                Object.keys(f.FunctionConfiguration.Environment.Variables).forEach(k=> {
                    f.FunctionConfiguration.Environment.Variables[k] = f.FunctionConfiguration.Environment.Variables[k]
                        .replace(/\${coreThingName}/g,coreThingName)
                        .replace(/\${coreThingType}/g, coreThingType)
                        .replace(/\${coreThingArn}/g, coreThingArn)
                        .replace(/\${region}/g, this.region)
                        .replace(/\${accountId}/g, this.accountId);
                });
            }
        })
        logger.debug(`greengrass.util expandFunctionEnvVars: exit: ${JSON.stringify(updated)}`);
        return updated;
    }

    private isFunctionEnvVarExpansionRequired(existing: AWS.Greengrass.FunctionDefinitionVersion, ): boolean {
        logger.debug(`greengrass.util isFunctionEnvVarExpansionRequired: in: existing:${JSON.stringify(existing)}`);
        let required=false;
        if (existing.Functions) {
            for (const f of existing.Functions) {
                if (f.FunctionConfiguration?.Environment?.Variables!==undefined) {
                    for(const k of Object.keys(f.FunctionConfiguration.Environment.Variables)) {
                        const val = f.FunctionConfiguration.Environment.Variables[k];
                        const tokens = [ "${coreThingName}", "${coreThingType}", "${coreThingType}", "${region}", "${accountId}" ];
                        required = tokens.some(token => val.includes(token));
                        if (required) {
                            break;
                        }
                    }
                }
                if (required) {
                    break;
                }
            }
        }
        logger.debug(`greengrass.util isFunctionEnvVarExpansionRequired: exit: ${required}`);
        return required;
    }

    public async getThings(things:__listOfCore|__listOfDevice) : Promise<ThingsMap> {
        logger.debug(`groups.service getThings: in: things: ${JSON.stringify(things)}`);

        const limit = pLimit(this.promisesConcurrency);
        const extractThingNameFromArn = (arn:string)=> arn.split('/')[1];
        
        const thingsFuture:Promise<AWS.Iot.DescribeThingResponse>[]= [];
        things?.forEach(t=> thingsFuture.push( limit(()=>this.iot.describeThing({thingName: extractThingNameFromArn(t.ThingArn)}).promise())));
        const thingsResults = await Promise.allSettled(thingsFuture);
        const thingsMap:ThingsMap = thingsResults
            .filter(r=> r.status==='fulfilled' && (<PromiseFulfilledResult<AWS.Iot.DescribeThingResponse>> r)?.value!==undefined)
            .map(r=> (<PromiseFulfilledResult<AWS.Iot.DescribeThingResponse>> r).value)
            .reduce((a,c)=> {
                a[c.thingName]=c;
                return a;
             } ,{} as ThingsMap);

        logger.debug(`groups.service getThings: exit: ${JSON.stringify(thingsMap)}`);
        return thingsMap;
    }

}

export interface FunctionDefEnvVarExpansionMap {
    [arn:string]: {
        isRequired:boolean,
        def?:AWS.Greengrass.FunctionDefinitionVersion
    }
}

export  type ThingsMap = {[name:string]:AWS.Iot.DescribeThingResponse};
