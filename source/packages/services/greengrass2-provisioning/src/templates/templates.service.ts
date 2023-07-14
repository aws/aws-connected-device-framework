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
import { inject, injectable } from 'inversify';
import clone from 'just-clone';
import ow from 'ow';
import pLimit from 'p-limit';

import {
    DescribeComponentCommand,
    DescribeComponentCommandOutput,
    GreengrassV2Client,
} from '@aws-sdk/client-greengrassv2';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import {
    TemplateListPaginationKey,
    TemplateVersionListPaginationKey,
    TemplatesDao,
} from './templates.dao';
import { Component, TemplateItem } from './templates.models';

@injectable()
export class TemplatesService {
    private ggv2: GreengrassV2Client;

    public constructor(
        @inject(TYPES.TemplatesDao) private dao: TemplatesDao,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client,
    ) {
        this.ggv2 = ggv2Factory();
    }

    public async create(template: TemplateItem): Promise<void> {
        logger.debug(`templates.service create: in: template:${JSON.stringify(template)}`);

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        // ensure does not already exist
        const existing = await this.get(template.name);
        if (existing !== undefined) {
            throw new Error('TEMPLATE_ALREADY_EXISTS');
        }

        // verify that all referenced components exist
        await this.validateComponents(template.components);

        // set defaults
        template.version = 1;
        template.createdAt = new Date();

        await this.dao.save(template);

        logger.debug(`templates.service create: exit`);
    }

    public async update(template: TemplateItem): Promise<void> {
        logger.debug(`templates.service update: in: template:${JSON.stringify(template)}`);

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.components, 'components', ow.array.nonEmpty);
        for (const c of template.components) {
            ow(c.key, 'component key', ow.string.nonEmpty);
            ow(c.version, 'component version', ow.string.nonEmpty);
        }

        // retrieve the latest existing version
        const existing = await this.get(template.name);
        if (existing === undefined) {
            throw new Error('TEMPLATE_NOT_FOUND');
        }

        const merged = Object.assign({}, existing, template);

        // verify that all referenced components exist
        await this.validateComponents(merged.components);

        // increment
        merged.version = (merged.version as number) + 1;
        merged.updatedAt = new Date();

        await this.dao.save(merged);

        logger.debug(`templates.service update: exit`);
    }

    private async validateComponents(components: Component[]): Promise<void> {
        logger.debug(
            `templates.service validateComponents: in: components:${JSON.stringify(components)}`,
        );

        const awsAccountId = process.env.AWS_ACCOUNTID;
        const awsRegion = process.env.AWS_REGION;

        for (const c of components) {
            const publicArn = `arn:aws:greengrass:${awsRegion}:aws:components:${c.key}:versions:${c.version}`;
            const accountSpecificArn = `arn:aws:greengrass:${awsRegion}:${awsAccountId}:components:${c.key}:versions:${c.version}`;

            const checks: Promise<DescribeComponentCommandOutput>[] = [];
            checks.push(this.ggv2.send(new DescribeComponentCommand({ arn: publicArn })));
            checks.push(this.ggv2.send(new DescribeComponentCommand({ arn: accountSpecificArn })));
            const [publicComponent, accountSpecificComponent] = await Promise.allSettled(checks);

            if (
                publicComponent.status === 'rejected' &&
                accountSpecificComponent.status === 'rejected'
            ) {
                throw new Error(`INVALID_COMPONENT: ${c.key}:${c.version}`);
            }
        }
        logger.debug(`templates.service validateComponents: exit`);
    }

    public async associateDeployment(template: TemplateItem): Promise<void> {
        logger.debug(
            `templates.service associateDeployment: in: template:${JSON.stringify(template)}`,
        );

        ow(template, ow.object.nonEmpty);
        ow(template.name, ow.string.nonEmpty);
        ow(template.deployment?.id, 'deployment id', ow.string.nonEmpty);
        ow(template.deployment.jobId, 'deployment job id', ow.string.nonEmpty);
        ow(
            template.deployment.thingGroupName,
            'deployment target thing group',
            ow.string.nonEmpty,
        );

        // save
        await this.dao.associateDeployment(template);

        logger.debug(`templates.service associateDeployment: exit`);
    }

    public async get(name: string, version?: number | string): Promise<TemplateItem> {
        logger.debug(`templates.service get: in: name:${name}, version:${version}`);

        ow(name, ow.string.nonEmpty);
        if (version === undefined) {
            version = 'current';
        }

        const template = await this.dao.get(name, version);
        logger.debug(`templates.service get: exit: ${JSON.stringify(template)}`);
        return template;
    }

    public async getByJobId(jobId: string): Promise<TemplateItem> {
        logger.debug(`templates.service getByJobId: in: jobId:${jobId}`);
        ow(jobId, ow.string.nonEmpty);

        const [name, version] = await this.dao.getTemplateIdByJobId(jobId);
        const template = await this.get(name, version);
        logger.debug(`templates.service getByJobId: exit: ${JSON.stringify(template)}`);
        return template;
    }

    public async listVersions(
        name: string,
        count?: number,
        lastEvaluated?: TemplateVersionListPaginationKey,
    ): Promise<[TemplateItem[], TemplateVersionListPaginationKey]> {
        logger.debug(
            `templates.service listVersions: in: name:${name}, count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        ow(name, ow.string.nonEmpty);

        if (count) {
            count = Number(count);
        }
        const result = await this.dao.listVersions(name, count, lastEvaluated);
        logger.debug(`templates.service listVersions: exit: ${JSON.stringify(result)}`);
        return result;
    }

    public async delete(name: string, version?: number | string): Promise<void> {
        logger.debug(`templates.service delete: in: name:${name}, version:${version}`);

        ow(name, ow.string.nonEmpty);

        const listVersionResponseSet = await this.listVersions(name);

        if (!listVersionResponseSet) return;

        const [versions, _] = listVersionResponseSet;

        if ((versions?.length ?? 0) > 0) {
            const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
            const deleteFutures: Promise<void>[] = [];
            for (const v of versions) {
                deleteFutures.push(
                    limit(async () => {
                        try {
                            this.dao.delete(v);
                        } catch (e) {
                            logger.error(
                                `templates.service delete: error: ${e.name}: ${e.message}`,
                            );
                        }
                    }),
                );
            }
            // The current version would be the last one
            const current = clone(versions[versions.length - 1]);
            current.version = 'current';
            deleteFutures.push(
                limit(async () => {
                    try {
                        this.dao.delete(current);
                    } catch (e) {
                        logger.error(`templates.service delete: error: ${e.name}: ${e.message}`);
                    }
                }),
            );

            await Promise.allSettled(deleteFutures);
        }

        logger.debug(`templates.service delete: exit:`);
    }

    public async list(
        count?: number,
        lastEvaluated?: TemplateListPaginationKey,
    ): Promise<[TemplateItem[], TemplateListPaginationKey]> {
        logger.debug(
            `templates.service list: in: count:${count}, lastEvaluated:${JSON.stringify(
                lastEvaluated,
            )}`,
        );

        if (count) {
            count = Number(count);
        }
        const result = await this.dao.list(count, lastEvaluated);

        logger.debug(`templates.service list: exit: ${JSON.stringify(result)}`);
        return result;
    }
}
