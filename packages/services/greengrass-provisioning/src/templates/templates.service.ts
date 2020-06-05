/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { injectable, inject } from 'inversify';
import { TemplateItem, TemplateItemList} from './templates.models';
import { TYPES } from '../di/types';
import {logger} from '../utils/logger.util';
import ow from 'ow';
import { TemplatesDao } from './templates.dao';
import AWS = require('aws-sdk');

@injectable()
export class TemplatesService  {

    private gg: AWS.Greengrass;

    constructor( @inject(TYPES.TemplatesDao) private templatesDao: TemplatesDao,
        // @inject(TYPES.TemplatesAssembler) private templatesAssembler: TemplatesAssembler,
        @inject(TYPES.GreengrassFactory) greengrassFactory: () => AWS.Greengrass) {
            this.gg = greengrassFactory();
        }

    public async save(item: TemplateItem) : Promise<TemplateItem> {
        logger.debug(`templates.service save: in: item: ${JSON.stringify(item)}`);

        ow(item, 'Template Information', ow.object.nonEmpty);
        ow(item.name, ow.string.nonEmpty);
        ow(item.groupId, ow.string.nonEmpty);

        let groupInfo;
        try {
            groupInfo = await this.gg.getGroup({GroupId:item.groupId}).promise();
        } catch (err) {
            // TODO: handle
            // if (err.code==='IdNotFoundException') {
            throw err;
        }

        // default version to latest if not provided
        if (!item.groupVersionId) {
            item.groupVersionId = groupInfo.LatestVersion;
        } else {
            // verify the version exists
            try {
                await this.gg.getGroupVersion({
                    GroupId: item.groupId,
                    GroupVersionId: item.groupVersionId}).promise();
                } catch (err) {
                    // TODO: handle
                    // if (err.code==='IdNotFoundException') {
                    throw err;
                }
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

    public async get(name:string) : Promise<TemplateItem> {
        logger.debug(`templates.service get: in: name:${name}`);

        ow(name, ow.string.nonEmpty);

        // retrieve
        const item = await this.templatesDao.get(name);

        logger.debug(`templates.service get: exit: item: ${JSON.stringify(item)}`);
        return item;

    }

    public async list() : Promise<TemplateItemList> {
        logger.debug(`templates.service list: in:`);

        // retrieve
        const items = await this.templatesDao.list();

        logger.debug(`templates.service get: exit: items: ${JSON.stringify(items)}`);
        return items;

    }

}
