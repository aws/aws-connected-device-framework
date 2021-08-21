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
import { injectable, inject } from 'inversify';
import ow from 'ow';
import AWS = require('aws-sdk');
import pLimit from 'p-limit';
import merge from 'deepmerge';
import equal from 'fast-deep-equal/es6';

import { GroupItem, GroupItemList} from './groups.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { GroupsDao } from './groups.dao';
import { GreengrassSubscriptionItemMap, TemplateItem } from '../templates/templates.models';
import { GreengrassSubscriptionItem } from '../subscriptions/subscriptions.models';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { GreengrassUtils, FunctionDefEnvVarExpansionMap } from '../utils/greengrass.util';
import { Pagination } from '../common/common.models';
import { TemplatesDao } from '../templates/templates.dao';
import { __listOfCore, __listOfDevice } from 'aws-sdk/clients/greengrass';

@injectable()
export class GroupsService  {

    private readonly DEFAULT_PAGINATION_LIMIT = 25;

    private gg: AWS.Greengrass;

    constructor (
        @inject(TYPES.SubscriptionsService) private subscriptionsService: SubscriptionsService,
        @inject(TYPES.TemplatesDao) private templatesDao: TemplatesDao,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject('defaults.promisesConcurrency') private promisesConcurrency:number,
        @inject(TYPES.GreengrassUtils) private ggUtils: GreengrassUtils,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass) {
            this.gg = greengrassFactory();
        }
        
    public async createGroups(items: GroupItemList) : Promise<GroupItemList> {
        logger.debug(`groups.service createGroups: in: items: ${JSON.stringify(items)}`);

        ow(items, 'Groups', ow.object.nonEmpty);
        ow(items.groups, 'Groups', ow.array.minLength(1));

        // retrieve all (unique) referenced templates
        const templateIds:TemplateItemVersionMap = items.groups.reduce( (accumulator, currentValue) => {
            if (accumulator[currentValue.templateName]===undefined) {
                accumulator[currentValue.templateName]= {};
            }
            const versionNo = (currentValue.templateVersionNo!==undefined) ? currentValue.templateVersionNo : 'latest';
            accumulator[currentValue.templateName][versionNo]= {};
            return accumulator;
        }, {});
        const templates = await this.getTemplateItems(templateIds);

        // retrieve greengrass group version of each referenced template
        const templateGroupVersions = await this.getTemplateGroupVersions(templates);

        // as we may have multiple versions of a template, figure out the latest
        const templateLatestVersions = this.reduceToLatestTemplateVersion(templates);

        // create the groups
        const limit = pLimit(this.promisesConcurrency);
        const groupFutures:Promise<AWS.Greengrass.CreateGroupResponse>[]= [];
        for(const i in items.groups) {
            const group = items.groups[i];
            // if a template version was not provided initially, set as the latest
            if (group.templateVersionNo===undefined) {
                group.templateVersionNo= templateLatestVersions[group.templateName];
            }
            // if we still havent derived a template version no, theres an issue
            if (group.templateVersionNo===undefined) {
                group.taskStatus='Failure';
                group.statusMessage='Unknown template/version';
                continue;
            } 
            
            // A Greengrass Group name is not a unique attribute in AWS IoT, but in our service we use it as a 
            // more friendly unique id, similar to thingName for devices. Check before proceeding whether we
            // know it has been used or not before - note this is based on whether our service knows about it,
            // and not whether AWS IoT Greengrass knows it (no efficient way of looking up).
            let existingGroupItem:GroupItem;
            try {
                existingGroupItem = await this.getGroup(group.name);
                if (existingGroupItem!==undefined) {
                    group.taskStatus='Failure';
                    group.statusMessage='Greengrass group name already in use.';
                    continue;
                }
            } catch (err) {
                if (err.message==='GROUP_NOT_FOUND') {
                    // expected for happy path, so swallow
                } else {
                    group.taskStatus='Failure';
                    group.statusMessage='Unable to retrrieve Greengrass group info.';
                    continue;
                }
            }
                
            // retrieve template group version info
            const templateDef = templateGroupVersions[group.templateName]?.[group.templateVersionNo]?.Definition;
            if (templateDef===undefined) {
                group.taskStatus='Failure';
                group.statusMessage='Invalid Greengrass group version associated with the template/version';
                continue;
            }

            // all good, prepare the promise to create the group
            groupFutures[i] = limit(()=> this.gg.createGroup({
                Name: group.name,
                InitialVersion: {
                    ConnectorDefinitionVersionArn: templateDef.ConnectorDefinitionVersionArn,
                    FunctionDefinitionVersionArn: templateDef.FunctionDefinitionVersionArn,
                    LoggerDefinitionVersionArn: templateDef.LoggerDefinitionVersionArn,
                    ResourceDefinitionVersionArn: templateDef.ResourceDefinitionVersionArn,
                    SubscriptionDefinitionVersionArn: templateDef.SubscriptionDefinitionVersionArn
                },
                tags: {
                    'cdf_template': group.templateName,
                    'cdf_template_version': group.templateVersionNo.toString()
                }
            }).promise());
        }

        const groupResults = await Promise.allSettled( groupFutures);

        for(const i in items.groups) {
            const group = items.groups[i];
            const status = groupResults[i]?.status;
            const created = (<PromiseFulfilledResult<AWS.Greengrass.CreateGroupResponse>> groupResults[i])?.value;
            if (status==='fulfilled' && created !==undefined && group.taskStatus!=='Failure') {
                group.id = created.Id;
                group.versionId = created.LatestVersion;
                group.arn = created.Arn;
                group.versionNo = 1;
                group.taskStatus='Success';
            } else {
                group.taskStatus='Failure';
                const reason = (<PromiseRejectedResult> groupResults[i])?.reason;
                if (reason) {
                    group.statusMessage=reason;
                }
            }
            group.createdAt = new Date();
            group.updatedAt = group.createdAt;
            group.deployed = false;
        }

        // save details of the groups that were created
        const groupsSuccessfullyCreated = items.groups.filter(g=> g.taskStatus==='Success');
        await this.groupsDao.saveGroups({groups: groupsSuccessfullyCreated});

        logger.debug(`groups.service createGroups: exit: id: ${JSON.stringify(items)}`);
        return items;

    }

    private reduceToLatestTemplateVersion(templates:TemplateItemVersionMap|TemplateGroupVersionMap) : {[name: string]: number} {
        const latest = Object.keys(templates).reduce((nameAccum, currentName) => {
            const maxVersionOfName = Object.keys(templates[currentName]).reduce((versionAccum, currentVersion) => {
                if (versionAccum[currentName]===undefined) {
                    versionAccum[currentName]=0
                }
                if (parseInt(currentVersion)>versionAccum[currentName]) {
                    versionAccum[currentName]= parseInt(currentVersion);
                }
                return versionAccum;
            }, {});
            return Object.assign(nameAccum, maxVersionOfName);
        }, {});
        return latest;
    }

    private populateMissingGroupinfo(groups:GroupItem[], existingGroupItemResults:PromiseSettledResult<GroupItem>[]) {
        logger.debug(`groups.service populateMissingGroupinfo: in: groups: ${JSON.stringify(groups)}, existingGroupItemResults" ${JSON.stringify(existingGroupItemResults)}`);

        for (const i in groups) {
            const g = groups[i];
            const existingGroup = (<PromiseFulfilledResult<GroupItem>> existingGroupItemResults[i])?.value;
            if (existingGroupItemResults[i]?.status==='fulfilled' && existingGroup!==undefined) {
                const merged = Object.assign({}, existingGroup, g);
                merged.templateVersionNo= g.templateVersionNo;  // overwrite incase templateVersionNo wasn't provided
                groups[i] = merged;
            } else {
                g.taskStatus = 'Failure';
                g.statusMessage = 'No existing group of this name.';
            }
        }
        logger.debug(`groups.service populateMissingGroupinfo: after: groups: ${JSON.stringify(groups)}`);
    }

    private async populateMissingTemplateVersions(groups:GroupItem[]) {
        logger.debug(`groups.service populateMissingTemplateVersions: in: groups: ${JSON.stringify(groups)}`);

        const templateNamesMissingVersions:TemplateItemVersionMap = [...new Set(groups
            .filter(g=> g.templateName!==undefined && g.templateVersionNo===undefined)
            .map(g=> g.templateName))]
            .reduce((a,v)=> {
                if (a[v]===undefined) {
                    a[v]= {};
                }
                a[v]['latest']= {};
                return a;
            },{});
        const templateLatestVersions = await this.getTemplateItems(templateNamesMissingVersions);
        groups.filter(g=> g.templateVersionNo===undefined)
            .forEach(g=> g.templateVersionNo = parseInt( Object.keys( templateLatestVersions[g.templateName])[0]));

        logger.debug(`groups.service populateMissingTemplateVersions: after: groups: ${JSON.stringify(groups)}`);
    }

    private async getGreengrassGroupVersions(greengrassGroups:PromiseSettledResult<AWS.Greengrass.GetGroupResponse>[]) : Promise<PromiseSettledResult<AWS.Greengrass.GetGroupVersionResponse>[]> {
        logger.debug(`groups.service getGreengrassGroupVersions: in: greengrassGroups: ${JSON.stringify(greengrassGroups)}`);

        const limit = pLimit(this.promisesConcurrency);

        const ggGroupVersionFutures:Promise<AWS.Greengrass.GetGroupVersionResponse>[]= [];
        for(const i in greengrassGroups) {
            const ggGroup = (<PromiseFulfilledResult<AWS.Greengrass.GetGroupResponse>> greengrassGroups[i])?.value;
            if (greengrassGroups[i]?.status==='fulfilled' && ggGroup!==undefined) {
                ggGroupVersionFutures[i] = limit(()=> this.gg.getGroupVersion({
                    GroupId: ggGroup.Id,
                    GroupVersionId: ggGroup.LatestVersion
                }).promise());
            }
        }
        const ggGroupVersions = await Promise.allSettled(ggGroupVersionFutures);
        logger.debug(`groups.service getGreengrassGroupVersions: exit: ${JSON.stringify(ggGroupVersions)}`);
        return ggGroupVersions;
    }

    private getUpdatedTemplateIds(groups:GroupItem[]) : TemplateItemVersionMap {
        logger.debug(`groups.service getUpdatedTemplateIds: groups: ${JSON.stringify(groups)}`);
        const updatedtemplateIds:TemplateItemVersionMap = groups
            .reduce((a,group)=> {
                if (a[group.templateName]===undefined) {
                    a[group.templateName]= {};
                }
                a[group.templateName][group.templateVersionNo]= {};
                return a;
            },{});
        logger.debug(`groups.service getUpdatedTemplateIds: exit: ${JSON.stringify(updatedtemplateIds)}`);
        return updatedtemplateIds;
    }

    private getExistingTemplateIds(existingGroupItemResults:PromiseSettledResult<GroupItem>[]) : TemplateItemVersionMap {
        logger.debug(`groups.service getExistingTemplateIds: existingGroupItemResults: ${JSON.stringify(existingGroupItemResults)}`);

        const existingTemplateIds:TemplateItemVersionMap = existingGroupItemResults
            .filter(r=> r.status==='fulfilled' && (<PromiseFulfilledResult<GroupItem>> r)?.value!==undefined)
            .map(r=> (<PromiseFulfilledResult<GroupItem>> r).value)
            .reduce((a,group)=> {
                if (a[group.templateName]===undefined) {
                    a[group.templateName]= {};
                }
                a[group.templateName][group.templateVersionNo]= {};
                return a;
            },{});
        
        logger.debug(`groups.service getExistingTemplateIds: exit: ${JSON.stringify(existingTemplateIds)}`);
        return existingTemplateIds;
    }

    public async updateGroups(items: GroupItemList) : Promise<GroupItemList> {
        logger.debug(`groups.service updateGroups: in: items: ${JSON.stringify(items)}`);

        ow(items, 'Groups', ow.object.nonEmpty);
        ow(items.groups, 'Groups', ow.array.minLength(1));

        const limit = pLimit(this.promisesConcurrency);

        const updatedGroups = items.groups;

        // retrieve the existing group items
        const existingGroupItemFutures:Promise<GroupItem>[]= updatedGroups.map(g=> limit(()=> this.getGroup(g.name)));
        const existingGroupItemResults = await Promise.allSettled( existingGroupItemFutures);

        // as providing a template for an existing group to update is optional, retrieve the existing template name where not provided
        this.populateMissingGroupinfo(updatedGroups, existingGroupItemResults);

        // as providing a template version is optional too (updated to latest if not provided), retrieve where not provided
        await this.populateMissingTemplateVersions(updatedGroups);

        // retrieve the existing gg group of the groups to update
        const existingGgGroupFutures:Promise<AWS.Greengrass.GetGroupResponse>[] = updatedGroups
            .map(g=> limit(()=> this.gg.getGroup({GroupId:g.id}).promise()));
        const existingGgGroups = await Promise.allSettled(existingGgGroupFutures);

        // retrieve the existing gg group version of where we were successfull in retrieving the gg group of the groups to update
        const existingGgGroupVersions = await this.getGreengrassGroupVersions(existingGgGroups);

        // now we know all the templates and versions that we're working with, retrieve the template items that we will be updating to
        const updatedtemplateIds = this.getUpdatedTemplateIds(updatedGroups);

        // in addition to the new template items, we need all the existing templates too
        const existingTemplateIds = this.getExistingTemplateIds(existingGroupItemResults);

        // retrieve the template items for all of these template ids
        const templateIds = merge(existingTemplateIds, updatedtemplateIds);
        const templateItems = await this.getTemplateItems(templateIds);

        // with the template items we can now retrieve their corresponding gg group versions
        const templateGroupVersions = await this.getTemplateGroupVersions(templateItems);

        // as part of updating groups we need to figure out the subscription template differences. As
        // there most likely will be multiple groups being updated from and to the same template version
        // we will cache these. The key is 'fromTemplateName-fromVersionNo-toTemplateName-toVersionNo'.
        const subscriptionTemplateModsMap:SubscriptionTemplateModsMap= {};

        // as part of updating groups we need to figure out the gg group subscriptions differences associated
        // with the templates. As there most likely will be multiple groups being updated from and to the same 
        // template versionwe will cache these. The key is 'fromGreengrassVersionId-toGreengrassVersionIid'.
        const ggSubscriptionModsMap:GgSubscriptionModsMap = {};

        const functionCache:FunctionDefEnvVarExpansionMap = {};

        // update the groups
        const ggCreateGroupVersionFutures:Promise<AWS.Greengrass.CreateGroupVersionResponse>[]= [];
        for(const i in updatedGroups) {

            const updatedGroup = updatedGroups[i];
            const existingGgVersionResponse = existingGgGroupVersions[i];
            const existingGgVersion = (<PromiseFulfilledResult<AWS.Greengrass.GetGroupVersionResponse>> existingGgVersionResponse)?.value;
            if (existingGgVersionResponse?.status!=='fulfilled' || existingGgVersion===undefined || updatedGroup.taskStatus==='Failure') {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = 'No existing Greengrass group version information found.';
                continue;
            }

            const existingGroupResponse = existingGroupItemResults[i];
            const existingGroup = (<PromiseFulfilledResult<GroupItem>>  existingGroupResponse)?.value;
            if (existingGroupResponse?.status!=='fulfilled' || existingGroup===undefined) {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = 'No existing group information found.';
                continue;
            }

            const existingTemplate = templateItems[existingGroup.templateName]?.[existingGroup.templateVersionNo];
            if (existingTemplate===undefined) {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = 'Invalid existing template Greengrass group version.';
                continue;
            } 

            const updatedTemplate = templateItems[updatedGroup.templateName]?.[updatedGroup.templateVersionNo];
            if (updatedTemplate==undefined) {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = 'Invalid updated template Greengrass group version.';
                continue;
            }

            const existingTemplateGroupVersion = templateGroupVersions[existingTemplate.name]?.[`${existingTemplate.versionNo}`];
            if (existingTemplateGroupVersion===undefined) {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = `No Greengrass group version found for existing template name:${existingTemplate.name}, versionNo:${existingTemplate.versionNo}`;
                continue;
            }  

            const updatedTemplateGroupVersion = templateGroupVersions[updatedTemplate.name]?.[`${updatedTemplate.versionNo}`];
            if (updatedTemplateGroupVersion===undefined) {
                updatedGroup.taskStatus='Failure';
                updatedGroup.statusMessage = `No Greengrass group version found for updated template name:${updatedTemplate.name}, versionNo:${updatedTemplate.versionNo}`;
                continue;
            }
            
            const existingSubscriptionVersionDef:AWS.Greengrass.SubscriptionDefinitionVersion = await this.ggUtils.getSubscriptionInfo(existingGgVersion.Definition?.SubscriptionDefinitionVersionArn);
            let newSubscriptionVersionDef = Object.assign({}, existingSubscriptionVersionDef);

            // merge device subscription templates
            newSubscriptionVersionDef = await this.processTemplateSubscriptionChanges(existingGgVersion.Definition.CoreDefinitionVersionArn, existingGgVersion.Definition.DeviceDefinitionVersionArn, existingTemplate, updatedTemplate, subscriptionTemplateModsMap, newSubscriptionVersionDef);

            // there may also be subscription differences between the greengrass groups associated with the existing and updated templates
            newSubscriptionVersionDef = await this.processGgGroupSubscriptionChanges(ggSubscriptionModsMap, existingTemplateGroupVersion, updatedTemplateGroupVersion, newSubscriptionVersionDef);

            // create the new subscription definition version (if changed)
            let subscriptionDefinitionVersionArn= existingGgVersion.Definition.SubscriptionDefinitionVersionArn;
            if (!equal(newSubscriptionVersionDef?.Subscriptions, existingSubscriptionVersionDef?.Subscriptions)) {
                subscriptionDefinitionVersionArn = await this.ggUtils.createSubscriptionDefinitionVersion(existingGgVersion.Definition.SubscriptionDefinitionVersionArn, newSubscriptionVersionDef);
            }

            const updatedDef = updatedTemplateGroupVersion.Definition;

            // lambda env vars may contain tokens to be expanded. if they do, they need to be unique to the 
            // greengrass group instead of associating the exact same version as defined in the template
            const functionArn = await this.ggUtils.processFunctionEnvVarTokens(functionCache, updatedDef.FunctionDefinitionVersionArn, existingGgVersion.Definition.CoreDefinitionVersionArn);

            // create the new greengrass group version  
            ggCreateGroupVersionFutures[i] = limit(()=> this.gg.createGroupVersion({
                GroupId: existingGroup.id,
                ConnectorDefinitionVersionArn: updatedDef.ConnectorDefinitionVersionArn,
                FunctionDefinitionVersionArn: functionArn,
                LoggerDefinitionVersionArn: updatedDef.LoggerDefinitionVersionArn,
                ResourceDefinitionVersionArn: updatedDef.ResourceDefinitionVersionArn,
                CoreDefinitionVersionArn: existingGgVersion.Definition.CoreDefinitionVersionArn,
                DeviceDefinitionVersionArn: existingGgVersion.Definition.DeviceDefinitionVersionArn,
                SubscriptionDefinitionVersionArn: subscriptionDefinitionVersionArn
            }).promise());
        }
        const ggCreateGroupVersionResults = await Promise.allSettled( ggCreateGroupVersionFutures);

        // process the results
        const tagFutures:Promise<unknown>[]= [];
        for(const i in updatedGroups) {
            const updatedGroup = updatedGroups[i];
            const ggCreateGroupVersionResult = ggCreateGroupVersionResults[i];
            logger.debug(`groups.service updateGroups: ggCreateGroupVersionResult[${i}]: ${JSON.stringify(ggCreateGroupVersionResult)}`);
            const fulfilled = (<PromiseFulfilledResult<AWS.Greengrass.CreateGroupVersionResponse>> ggCreateGroupVersionResult)?.value;
            if (ggCreateGroupVersionResult?.status==='fulfilled' && fulfilled!==undefined && updatedGroup.taskStatus!=='Failure') {
                updatedGroup.id = fulfilled.Id;
                updatedGroup.arn = fulfilled.Arn;
                updatedGroup.versionId = fulfilled.Version;
                updatedGroup.versionNo+= 1;
                updatedGroup.taskStatus='Success';

                // update the tags of the group to reflect the updated template
                tagFutures.push( limit(()=> this.gg.tagResource({ResourceArn:updatedGroup.arn, tags: {
                    'cdf_template': updatedGroup.templateName,
                    'cdf_template_version': updatedGroup.templateVersionNo.toString()
                }}).promise()));

            } else {
                let existingGroup = (<PromiseFulfilledResult<GroupItem>> existingGroupItemResults[i]).value;
                if (existingGroup===undefined) {
                    existingGroup = items.groups[i];
                }
                const failedGroup = Object.assign({}, existingGroup);
                failedGroup.taskStatus='Failure';
                failedGroup.statusMessage = updatedGroup.statusMessage ?? (<PromiseRejectedResult> ggCreateGroupVersionResult)?.reason ?? failedGroup.statusMessage;
                updatedGroups[i]= failedGroup;
            }
            updatedGroups[i].updatedAt = new Date();
            updatedGroups[i].deployed = false;
        }
        await Promise.allSettled( tagFutures);

        // save details of the groups that were created
        await this.groupsDao.saveGroups(items);

        logger.debug(`groups.service updateGroups: exit: id: ${JSON.stringify(items)}`);
        return items;

    }

    private async processGgGroupSubscriptionChanges(ggSubscriptionModsMap: GgSubscriptionModsMap, existingTemplateGroupVersion: AWS.Greengrass.GetGroupVersionResponse, updatedTemplateGroupVersion: AWS.Greengrass.GetGroupVersionResponse, subscriptionVersionDef: AWS.Greengrass.SubscriptionDefinitionVersion) : Promise<AWS.Greengrass.SubscriptionDefinitionVersion>  {

        logger.debug(`groups.service processGgGroupSubscriptionChanges: in: ggSubscriptionModsMap:${JSON.stringify(ggSubscriptionModsMap)}, existingTemplateGroupVersion: ${JSON.stringify(existingTemplateGroupVersion)}, updatedTemplateGroupVersion: ${JSON.stringify(updatedTemplateGroupVersion)}, subscriptionVersionDef:${JSON.stringify(subscriptionVersionDef)}`);


        const newSubscriptionVersionDef = Object.assign({}, subscriptionVersionDef);

        const cacheKey = `${existingTemplateGroupVersion.Version}-${updatedTemplateGroupVersion.Version}`;
        if (ggSubscriptionModsMap[cacheKey] === undefined) {
            const existingTemplateSubscriptions = await this.ggUtils.getSubscriptionInfo(existingTemplateGroupVersion.Definition.SubscriptionDefinitionVersionArn);
            const updatedTemplateSubscriptions = await this.ggUtils.getSubscriptionInfo(updatedTemplateGroupVersion.Definition.SubscriptionDefinitionVersionArn);
            const [toRemove, toAdd] = this.diffGreengrassSubscriptionDefs(existingTemplateSubscriptions?.Subscriptions, updatedTemplateSubscriptions?.Subscriptions);
            ggSubscriptionModsMap[cacheKey] = { toRemove, toAdd };
        }
        const mods = ggSubscriptionModsMap[cacheKey];
        if (mods.toRemove.length > 0 || mods.toAdd.length > 0) {

            // remove subscriptions no longer required
            mods.toRemove.forEach(id => {
                newSubscriptionVersionDef.Subscriptions = newSubscriptionVersionDef.Subscriptions?.filter(s => s.Id !== id);
            });

            // add new subscriptions
            mods.toAdd.forEach(item => {
                newSubscriptionVersionDef.Subscriptions?.push(item);
            });
        }

        logger.debug(`groups.service processGgGroupSubscriptionChanges: exit:${JSON.stringify(newSubscriptionVersionDef)}`);
        return newSubscriptionVersionDef;
    }

    private async processTemplateSubscriptionChanges(coreDefinitionVersionArn:string, deviceDefinitionVersionArn:string, existingTemplate:TemplateItem, updatedTemplate: TemplateItem, subscriptionTemplateModsMap:SubscriptionTemplateModsMap, subscriptionVersionDef: AWS.Greengrass.SubscriptionDefinitionVersion) : Promise<AWS.Greengrass.SubscriptionDefinitionVersion> {

        logger.debug(`groups.service processTemplateSubscriptionChanges: in: coreDefinitionVersionArn: ${coreDefinitionVersionArn}, deviceDefinitionVersionArn: ${deviceDefinitionVersionArn}, updatedTemplate: ${JSON.stringify(updatedTemplate)}, subscriptionVersionDef: ${JSON.stringify(subscriptionVersionDef)}`);

        const newSubscriptionVersionDef = Object.assign({}, subscriptionVersionDef);

        const cacheKey = `${existingTemplate.name}-${existingTemplate.versionNo}-${updatedTemplate.name}-${updatedTemplate.versionNo}`;
        if (subscriptionTemplateModsMap[cacheKey] === undefined) {
            const [toRemove, toAdd] = this.diffSubscriptionTemplates(existingTemplate.subscriptions, updatedTemplate.subscriptions);
            subscriptionTemplateModsMap[cacheKey] = { toRemove, toAdd };
        }
        const {toRemove, toAdd} = subscriptionTemplateModsMap[cacheKey];
        if (Object.keys(toRemove).length > 0 || Object.keys(toAdd).length > 0) {
            const existingDevicesVersionDef = await this.ggUtils.getDeviceInfo(deviceDefinitionVersionArn);
            const existingCoreVersionDef = await this.ggUtils.getCoreInfo(coreDefinitionVersionArn);

            // as subscription templates may be configured per thing type, and the subscription attributes may be built from thing attributes, we need the things info
            const core = await this.ggUtils.getThings(existingCoreVersionDef?.Cores)
            const devices = await this.ggUtils.getThings(existingDevicesVersionDef?.Devices);
            const things = Object.assign({}, core, devices);

            // remove device subscriptions no longer required
            Object.keys(toRemove).forEach(thingType => {
                toRemove[thingType].forEach(subscription => {
                    Object.values(things)
                        .filter(t => t.thingTypeName === thingType || thingType === '__all')
                        .forEach(v => {
                            const expandedSubscription = this.subscriptionsService.expandSubscriptionTemplate(subscription, v.thingName, v.thingTypeName, v.thingArn);
                            newSubscriptionVersionDef.Subscriptions = newSubscriptionVersionDef.Subscriptions?.filter(s => s.Id !== expandedSubscription.id);
                        });
                });
            });

            // add new device subscriptions
            Object.keys(toAdd).forEach(thingType => {
                toAdd[thingType].forEach(subscription => {
                    Object.values(things)
                        .filter(t => t.thingTypeName === thingType || thingType === '__all')
                        .forEach(v => {
                            const expandedSubscription = this.subscriptionsService.expandSubscriptionTemplate(subscription, v.thingName, v.thingTypeName, v.thingArn);
                            newSubscriptionVersionDef.Subscriptions?.push({
                                Id: expandedSubscription.id,
                                Source: expandedSubscription.source,
                                Subject: expandedSubscription.subject,
                                Target: expandedSubscription.target
                            });
                        });
                });
            });
        }

        logger.debug(`groups.service processTemplateSubscriptionChanges: exit:${JSON.stringify(newSubscriptionVersionDef)}`);
        return newSubscriptionVersionDef;
    }

    private diffGreengrassSubscriptionDefs(existing:AWS.Greengrass.Subscription[], updated:AWS.Greengrass.Subscription[] ) : [string[], AWS.Greengrass.Subscription[]] {
        logger.debug(`groups.service diffGreengrassSubscriptionDefs: in: existing: ${JSON.stringify(existing)}, updated: ${JSON.stringify(updated)}`);

        const toRemove:string[]= [];
        const toAdd:AWS.Greengrass.Subscription[]= [];

        if (!equal(existing, updated)) {
            // 1st figure what has been changed or removed
            existing.forEach(item=> {
                const found = updated?.find(s=> s.Id===item.Id);
                if (!found) {
                    // does not exist in the updated template therefore remove
                    toRemove.push(item.Id);
                } else {
                    if (item.Source!==found.Source || item.Subject!==found.Subject || item.Target!==found.Target) {
                        // exists but has changed, therefore remove then re-add
                        toRemove.push(item.Id);
                        toAdd.push(found);
                    }
                }
            });
            // 2nd figure out what are new
            updated.forEach(item=> {
                const found = existing?.find(s=> s.Id===item.Id);
                if (!found) {
                    toAdd.push(item);
                }
            });
        }

        logger.debug(`groups.service diffGreengrassSubscriptionDefs: exit: toRemove: ${JSON.stringify(toRemove)}, toAdd: ${JSON.stringify(toAdd)}`);
        return [toRemove,toAdd];
    } 

    /**
     * Returns which subscriptions to remove, and which to add, based on the difference between 2 templates.
     * @param existing Existing subscription template map
     * @param updated Updated subscription template map
     */
    private diffSubscriptionTemplates(existing:GreengrassSubscriptionItemMap, updated:GreengrassSubscriptionItemMap ) : [GreengrassSubscriptionItemMap,GreengrassSubscriptionItemMap] {
        logger.debug(`groups.service diffSubscriptionTemplates: in: existing: ${JSON.stringify(existing)}, updated: ${JSON.stringify(updated)}`);

        const toRemove:GreengrassSubscriptionItemMap= {};
        const toAdd:GreengrassSubscriptionItemMap= {};

        const addToRemove = (existingType:string,existingItem:GreengrassSubscriptionItem)=> {
            if (toRemove[existingType]===undefined) {
                toRemove[existingType]= [];
            }
            toRemove[existingType].push(existingItem)
        };

        const addToAdd = (updatedType:string,updatedItem:GreengrassSubscriptionItem)=> {
            if (toAdd[updatedType]===undefined) {
                toAdd[updatedType]= [];
            }
            toAdd[updatedType].push(updatedItem)
        };

        if (!equal(existing, updated)) {
            // 1st figure what has been changed or removed
            Object.keys(existing).forEach(type=> {
                existing[type].forEach(item=> {
                    const found = updated[type]?.find(s=> s.id===item.id);
                    if (!found) {
                        // does not exist in the updated template therefore remove
                        addToRemove(type, item);
                    } else {
                        // exists but has changed, therefore remove then re-add
                        if (item.source!==found.source || item.subject!==found.subject || item.target!==found.target) {
                            addToRemove(type,item);
                            addToAdd(type,found);
                        }
                    }
                });
            });
            // 2nd figure out what are new
            Object.keys(updated).forEach(type=> {
                updated[type].forEach(item=> {
                    const found = existing[type]?.find(s=> s.id===item.id);
                    if (!found) {
                        addToAdd(type,item);
                    }
                });
            });
        }

        logger.debug(`groups.service diffSubscriptionTemplates: exit: toRemove: ${JSON.stringify(toRemove)}, toAdd: ${JSON.stringify(toAdd)}`);
        return [toRemove,toAdd];
    } 

    private async getTemplateItems(templateIds:TemplateItemVersionMap) : Promise<TemplateItemVersionMap> {
        logger.debug(`groups.service getTemplateItems: in: templateIds: ${JSON.stringify(templateIds)}`);

        const limit = pLimit(this.promisesConcurrency);

        // retrieve all (unique) referenced templates
        const templateFutures:Promise<TemplateItem>[]= [];
        for (const name of Object.keys(templateIds)) {
            for (const versionNo of Object.keys(templateIds[name])) {
                if (versionNo==='latest') {
                    templateFutures.push( limit(()=> this.templatesDao.get(name)));
                } else {
                    templateFutures.push( limit(()=> this.templatesDao.get(name, parseInt(versionNo))));
                }
            }
        }
        const templateResults = await Promise.allSettled( templateFutures);
        const templates:TemplateItemVersionMap= {};
        for(const t of templateResults) {
            const fulfilled = (<PromiseFulfilledResult<TemplateItem>> t)?.value;
            if (t.status==='fulfilled' && fulfilled!==undefined) {
                if (templates[fulfilled.name]===undefined) {
                    templates[fulfilled.name]= {};
                }
                templates[fulfilled.name][fulfilled.versionNo] = fulfilled;
            }
        }

        logger.debug(`groups.service getTemplateItems: exit: templates: ${JSON.stringify(templates)}`);
        return templates;
    }

    private async getTemplateGroupVersions(templates:TemplateItemVersionMap) : Promise<TemplateGroupVersionMap> {
        logger.debug(`groups.service getTemplateGroupVersions: in: templates:${JSON.stringify(templates)}`);

        const limit = pLimit(this.promisesConcurrency);

        // retrieve greengrass group version of each referenced template
        const reverseLookup:GroupVersionTemplateMap= {};
        const groupVersionFutures:Promise<AWS.Greengrass.GetGroupVersionResponse>[]= [];
        for (const name of Object.keys(templates)) {
            for (const versionNo of Object.keys(templates[name])) {
                const template = templates[name][versionNo];
                groupVersionFutures.push( limit(()=> this.gg.getGroupVersion({
                    GroupId: template.groupId,
                    GroupVersionId: template.groupVersionId
                }).promise()));
                if (reverseLookup[template.groupId]===undefined) {
                    reverseLookup[template.groupId]= {};
                }
                if (reverseLookup[template.groupId][template.groupVersionId]===undefined) {
                    reverseLookup[template.groupId][template.groupVersionId]= [];
                }
                reverseLookup[template.groupId][template.groupVersionId].push({name, versionNo});
            }
        }
        
        const groupVersionResults = await Promise.allSettled( groupVersionFutures);

        const groupVersions:TemplateGroupVersionMap= {};
        for(const i in groupVersionResults) {
            const fulfilled = (<PromiseFulfilledResult<AWS.Greengrass.GetGroupVersionResponse>> groupVersionResults[i])?.value;
            if (groupVersionResults[i].status==='fulfilled' && fulfilled!==undefined) {
                const templateIds = reverseLookup[fulfilled.Id][fulfilled.Version];
                templateIds.forEach(ids=> {
                    if (groupVersions[ids.name]===undefined) {
                        groupVersions[ids.name]= {};
                    }
                    groupVersions[ids.name][ids.versionNo] = fulfilled;
                });
            }
        }

        logger.debug(`groups.service getTemplateGroupVersions: exit: ${JSON.stringify(groupVersions)}`);
        return groupVersions;
    }

    public async getGroup(name:string) : Promise<GroupItem> {
        logger.debug(`groups.service getGroup: in: name: ${name}`);

        ow(name, 'Group Name', ow.string.nonEmpty);

        const group = await this.groupsDao.get(name);
        if (group===undefined) {
            throw new Error ('GROUP_NOT_FOUND');
        }

        logger.debug(`groups.service getGroup: exit: group: ${JSON.stringify(group)}`);
        return group;

    }

    public async deleteGroup(name:string) : Promise<void> {
        logger.debug(`groups.service deleteGroup: in: name: ${name}`);

        ow(name, 'Group Name', ow.string.nonEmpty);

        // ensure it exists
        let group ;
        try {
            group = await this.groupsDao.get(name);
        } catch (err) {
            // swallow
        }
        
        if (group===undefined) {
            throw new Error ('GROUP_NOT_FOUND');
        }
        // delete the gg group. note that if a deployment has previously taken place then
        // this will deliberately fail if the user has not created a force reset deployment
        try {
            await this.gg.deleteGroup({GroupId: group.id}).promise();
        } catch (err) {
            // ignore error
        }

        // delete the group
        await this.groupsDao.delete(name);

        logger.debug(`groups.service deleteGroup: exit: `);
    }

    public async listByTemplate(name:string, versionNo?:number, pagination?:Pagination) : Promise<GroupItemList> {
        logger.debug(`groups.service listByTemplate: in: name: ${name}, versionNo:${versionNo}, pagination:${JSON.stringify(pagination)}`);

        ow(name, ow.string.nonEmpty);

        if (pagination===undefined) {
            pagination = {
                token: undefined,
                limit: this.DEFAULT_PAGINATION_LIMIT
            }
        }

        const groups = await this.groupsDao.listByTemplate(name, versionNo, pagination);

        logger.debug(`groups.service listByTemplate: exit: groups: ${JSON.stringify(groups)}`);
        return groups;

    }

}

interface TemplateGroupVersionMap {
    [name:string] : {
        [versionNo: string] : AWS.Greengrass.GetGroupVersionResponse
    }
}
interface TemplateItemVersionMap {
    [name:string] : {
        [versionNo: string] : TemplateItem
    }
}
interface GroupVersionTemplateMap {
    [ggId:string] : {
        [ggVersionId: string] : TemplateId[]
    }
}
interface TemplateId {
    name: string,
    versionNo: string
}
interface SubscriptionTemplateModsMap {
    [key : string] : {
        toAdd: GreengrassSubscriptionItemMap,
        toRemove: GreengrassSubscriptionItemMap
    }
}

interface GgSubscriptionModsMap {
    [key : string] : {
        toRemove: string[]
        toAdd: AWS.Greengrass.Subscription[],
    }
}
