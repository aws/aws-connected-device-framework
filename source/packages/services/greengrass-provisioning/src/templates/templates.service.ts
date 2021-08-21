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
import { TemplateItem, TemplateItemList} from './templates.models';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger.util';
import ow from 'ow';
import { TemplatesDao } from './templates.dao';
import AWS = require('aws-sdk');
import { GroupsDao } from '../groups/groups.dao';

@injectable()
export class TemplatesService  {

    private gg: AWS.Greengrass;

    constructor( 
        @inject(TYPES.GroupsDao) private groupsDao: GroupsDao,
        @inject(TYPES.TemplatesDao) private templatesDao: TemplatesDao,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass) {
            this.gg = greengrassFactory();
        }

    public async save(item: TemplateItem) : Promise<TemplateItem> {
        logger.debug(`templates.service save: in: item: ${JSON.stringify(item)}`);

        ow(item, 'Template Information', ow.object.nonEmpty);
        ow(item.name, ow.string.nonEmpty);
        ow(item.groupId, ow.string.nonEmpty);

        const groupInfo = await this.gg.getGroup({GroupId:item.groupId}).promise();
        
        // default version to latest if not provided
        if (!item.groupVersionId) {
            item.groupVersionId = groupInfo.LatestVersion;
        } else {
            // verify the version exists (error will be thrown if not)
            await this.gg.getGroupVersion({
                    GroupId: item.groupId,
                    GroupVersionId: item.groupVersionId}).promise();
        }

        // retrieve existing
        const existingItem = await this.templatesDao.get(item.name);

        // set remanining data
        const now = new Date();
        item.updatedAt = now;
        if (existingItem) {
            item.versionNo = existingItem.versionNo+1;
            item.createdAt = existingItem.createdAt;
            item.enabled = item.enabled ?? existingItem.enabled;
        } else {
            item.versionNo = 1;
            item.createdAt = now;
            item.updatedAt = item.createdAt;
            item.enabled = item.enabled ?? true;
        }

        // save
        await this.templatesDao.save(item);

        // tag what we're using
        await this.gg.tagResource({
            ResourceArn: groupInfo.Arn,
            tags: {
                cdf_templateName: item.name
            }
        }).promise();

        logger.debug(`templates.service save: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public async get(name:string, versionNo?:number) : Promise<TemplateItem> {
        logger.debug(`templates.service get: in: name:${name}, versionNo:${versionNo}`);

        ow(name, ow.string.nonEmpty);

        // retrieve
        const item = await this.templatesDao.get(name, versionNo);
        if (item===undefined) {
            throw new Error('TEMPLATE_NOT_FOUND');
        }

        logger.debug(`templates.service get: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public async delete(name:string) : Promise<void> {
        logger.debug(`templates.service delete: in: name:${name}`);

        ow(name, ow.string.nonEmpty);

        // ensure not in use
        const groupInUse = await this.groupsDao.listByTemplate(name, undefined, {limit:1} );
        if (groupInUse?.groups?.length>0) {
            throw new Error("TEMPLATE_IN_USE");
        }

        await this.templatesDao.delete(name);

        logger.debug(`templates.service get: delete:`);
    }

    public async list() : Promise<TemplateItemList> {
        logger.debug(`templates.service list: in:`);

        // retrieve
        const items = await this.templatesDao.list();

        logger.debug(`templates.service get: exit: items: ${JSON.stringify(items)}`);
        return items;

    }

}
