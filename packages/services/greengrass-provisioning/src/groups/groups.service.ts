/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { GroupItemList, GroupItem} from './groups.models';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger.util';
import ow from 'ow';
import { GroupsDao } from './groups.dao';
import AWS = require('aws-sdk');
import { TemplatesService } from '../templates/templates.service';
import { TemplateItem } from '../templates/templates.models';

@injectable()
export class GroupsService  {

    private gg: AWS.Greengrass;

    constructor (
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass) {
            this.gg = greengrassFactory();
        }

    public async createGroups(items: GroupItemList) : Promise<GroupItemList> {
        logger.debug(`groups.service createGroups: in: items: ${JSON.stringify(items)}`);

        ow(items, 'Groups', ow.object.nonEmpty);
        ow(items.groups, 'Groups', ow.array.minLength(1));

        // retrieve all referenced templates
        const templateNames = [...new Set(items.groups.map(g=> g.templateName))];
        const templates:{[name:string] : TemplateItem}= {};
        for (const name of templateNames) {
            const template = await this.templatesService.get(name);
            if (template===undefined) {
                throw new Error('TEMPLATE_NOT_FOUND');
            }
            templates[name] = template;
        }

        // retrieve all referenced greengrass group versions
        // TODO: parallel processing of promises...
        const groupVersions:{[name:string] : AWS.Greengrass.GetGroupVersionResponse}= {};
        for (const name of templateNames) {
            const template = templates[name];
            const versionInfo = await this.gg.getGroupVersion({
                GroupId: template.groupId,
                GroupVersionId: template.groupVersionId
            }).promise();

            if (versionInfo===undefined) {
                throw new Error('TEMPLATE_GROUP_VERSION_NOT_FOUND');
            }
            groupVersions[name] = versionInfo;
        }

        // create the groups
        // TODO: parallel processing of promises...
        for(const group of items.groups) {
            const template = templates[group.templateName];
            const templateVersionInfo = groupVersions[group.templateName];
            const templateDef = templateVersionInfo.Definition;
            const created = await this.gg.createGroup({
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
                    'cdf_template_version': template.versionNo.toString()
                }
            }).promise();

            group.id = created.Id;
            group.versionId = created.LatestVersion;
            group.arn = created.Arn;
            group.templateVersionNo = template.versionNo;
            group.versionNo = 1;
            group.createdAt = new Date();
            group.updatedAt = group.createdAt;
            group.deployed = false;
        }

        // TODO: save details of the groups that were created
        await this.groupsDao.saveGroups(items);

        logger.debug(`groups.service createGroups: exit: id: ${JSON.stringify(items)}`);
        return items;

    }

    public async getGroup(name:string) : Promise<GroupItem> {
        logger.debug(`groups.service getGroup: in: name: ${name}`);

        ow(name, 'Group Name', ow.string.nonEmpty);

        const group = await this.groupsDao.get(name);

        logger.debug(`groups.service getGroup: exit: group: ${JSON.stringify(group)}`);
        return group;

    }

}
