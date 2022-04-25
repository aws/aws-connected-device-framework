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
import ow from 'ow';
import {inject, injectable} from 'inversify';

import { logger } from '../utils/logger.util';
import { TYPES } from '../di/types';
import { S3Utils } from '../utils/s3.util';

import { PatchTemplateItem } from './template.model';
import { PatchTemplatesDao, TemplateListPaginationKey } from './template.dao';

@injectable()
export class PatchTemplatesService {
    constructor(
        @inject(TYPES.PatchTemplateDao) private patchTemplatesDao: PatchTemplatesDao,
        @inject(TYPES.S3Utils) private s3Utils: S3Utils,
        @inject('aws.s3.bucket') private s3Bucket: string,
        @inject('aws.s3.prefix') private s3Prefix: string
    ) {}

    public async create(template: PatchTemplateItem): Promise<void> {
        logger.debug(`templates.service save: in: item: ${JSON.stringify(template)}`);

        ow(template, 'Template Information', ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.patchType, ow.string.nonEmpty);
        ow(template.playbookName, ow.string.nonEmpty);
        ow(template.playbookFile, ow.object.hasKeys('buffer'));

        const existingTemplate = await this.patchTemplatesDao.get(template.name);

        if (existingTemplate) {
            throw new Error("CONFLICT");
        }

        template.versionNo = 1;
        template.createdAt = new Date();
        template.updatedAt = template.createdAt;
        template.enabled = template.enabled ?? true;

        const uploadPath = `${this.s3Prefix}playbooks/${template.name}___${template.playbookName}`;
        await this.s3Utils.uploadFile(this.s3Bucket, uploadPath, template.playbookFile);

        template.playbookSource = {
            bucket: this.s3Bucket,
            key: uploadPath
        };

        await this.patchTemplatesDao.save(template);

    }

    public async update(template: PatchTemplateItem): Promise<void> {
        logger.debug(`templates.service update: in: item: ${JSON.stringify(template)}`);

        ow(template, 'Template Information', ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);

        const existingTemplate = await this.patchTemplatesDao.get(template.name);

        if (!existingTemplate) {
            throw new Error("NOT_FOUND");
        }

        template.updatedAt = new Date();
        template.versionNo = existingTemplate.versionNo+1;
        template.createdAt = existingTemplate.createdAt;
        template.enabled = existingTemplate.enabled ?? existingTemplate.enabled;

        if (template.extraVars){
            template.extraVars = {
                ...existingTemplate.extraVars,
                ...template.extraVars
            };
        }

        template = {
            ...existingTemplate,
            ...template
        };

        if(template.playbookFile) {
            const uploadPath = `${this.s3Prefix}playbooks/${template.name}___${template.playbookName}`;
            await this.s3Utils.uploadFile(this.s3Bucket, uploadPath, template.playbookFile);

            template.playbookSource = {
                bucket: this.s3Bucket,
                key: uploadPath
            };
        }

        await this.patchTemplatesDao.save(template);
    }

    public async get(name: string): Promise<PatchTemplateItem> {
        logger.debug(`templates.service get: in name: ${name}`);

        ow(name, ow.string.nonEmpty);

        const template = await this.patchTemplatesDao.get(name);

        if(!template) {
            throw new Error('NOT_FOUND');
        }

        logger.debug(`templates.service get: exit: item: ${JSON.stringify(template)}`);
        return template;
    }

    public async list(count?: number, lastEvaluated?: TemplateListPaginationKey): Promise<[PatchTemplateItem[], TemplateListPaginationKey]> {
       logger.debug(`templates.service count:${count}, lastEvaluated:${JSON.stringify(lastEvaluated)}:`);

        if (count) {
            count = Number(count);
        }

        // retrieve
        const result = await this.patchTemplatesDao.list(count, lastEvaluated);

        logger.debug(`templates.service get: exit: items: ${JSON.stringify(result)}`);
        return result;

    }

    public async delete(name:string) : Promise<void> {
        logger.debug(`templates.service delete: in: name:${name}`);

        ow(name, ow.string.nonEmpty);

        const template = await this.get(name);

        if(template){
            await this.patchTemplatesDao.delete(name);
            await this.s3Utils.deleteObject(template.playbookSource.bucket, template.playbookSource.key);
        }


        logger.debug(`templates.service get: delete:`);
    }
}
