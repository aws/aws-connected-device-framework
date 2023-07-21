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
import ow from 'ow';

import { logger } from '@awssolutions/simple-cdf-logger';
import { TYPES } from '../di/types';
import { TemplateItem } from '../templates/templates.models';
import { TemplatesService } from '../templates/templates.service';
import { FleetDao } from './fleet.dao';
import { TemplateUsage } from './fleet.model';

@injectable()
export class FleetService {
    public constructor(
        @inject(TYPES.TemplatesService) private templatesService: TemplatesService,
        @inject(TYPES.FleetDao) private dao: FleetDao
    ) {}

    public async listTemplateUsage(): Promise<TemplateUsage> {
        logger.debug(`fleet.service listTemplateUsage: in:`);

        const r: TemplateUsage = {
            templates: {},
        };

        // obtain the desired and reported template usage
        const [desired, reported] = await this.dao.listTemplateUsage();

        const initTemplateVersion = (name: string, version: number) => {
            if (r.templates[name] === undefined) {
                r.templates[name] = {
                    latestVersion: 0,
                    versions: {},
                };
            }
            if (r.templates[name].versions[version] === undefined) {
                r.templates[name].versions[version] = {
                    desiredInUse: 0,
                    reportedInUse: 0,
                    lastDeploymentSuccess: 0,
                    lastDeploymentFailed: 0,
                    lastDeploymentInProgress: 0,
                };
            }
        };

        // add the desired state to the response
        if (desired !== undefined) {
            Object.keys(desired).forEach((templateName) => {
                Object.keys(desired[templateName]).forEach((templateVersion) => {
                    const templateVersionNumber = parseInt(templateVersion);
                    initTemplateVersion(templateName, templateVersionNumber);
                    const tv = r.templates[templateName].versions[templateVersionNumber];
                    tv.desiredInUse = desired[templateName][templateVersion].inUse ?? 0;
                    tv.lastDeploymentSuccess =
                        desired[templateName][templateVersion].SUCCEEDED ?? 0;
                    tv.lastDeploymentFailed = desired[templateName][templateVersion].FAILED ?? 0;
                    tv.lastDeploymentInProgress =
                        desired[templateName][templateVersion].IN_PROGRESS ?? 0;
                });
            });
        }

        // add the reported state to the response
        if (reported !== undefined) {
            Object.keys(reported).forEach((templateName) => {
                Object.keys(reported[templateName]).forEach((templateVersion) => {
                    initTemplateVersion(templateName, Number(templateVersion));
                    r.templates[templateName].versions[templateVersion].reportedInUse =
                        reported[templateName][templateVersion];
                });
            });
        }

        // augment the response with the latest version for each template
        const templateFutures: Promise<TemplateItem>[] = [];
        Object.keys(r.templates)
            .filter((templateName) => templateName !== 'None')
            .forEach((templateName) => {
                templateFutures.push(this.templatesService.get(templateName));
            });

        const templateResults = await Promise.allSettled(templateFutures);
        for (const result of templateResults) {
            if (result.status === 'fulfilled') {
                if (result.value) {
                    r.templates[result.value.name].latestVersion = result.value.version as number;
                }
            }
        }

        logger.debug(`fleet.service listTemplateUsage: exit: ${JSON.stringify(r)}`);
        return r;
    }

    public async aggregateTemplateStatusChange(
        type: 'desired' | 'reported',
        oldTemplate?: TemplateAttributes,
        newTemplate?: TemplateAttributes
    ): Promise<void> {
        logger.debug(
            `fleet.service aggregateTemplateStatusChange: in: type:${type}, oldTemplate:${JSON.stringify(
                oldTemplate
            )}, newTemplate:${JSON.stringify(newTemplate)}`
        );

        ow(type, ow.string.oneOf(['desired', 'reported']));

        try {
            if (oldTemplate?.name !== undefined) {
                await this.dao.decrementTemplateUsage(
                    type,
                    oldTemplate.name,
                    oldTemplate.version,
                    oldTemplate.deploymentStatus
                );
            }
        } catch (e) {
            logger.error(
                `fleet.service aggregateTemplateStatusChange: failed decrementing usage: ${e.name}`
            );
        }

        try {
            if (newTemplate?.name !== undefined) {
                await this.dao.incrementTemplateUsage(
                    type,
                    newTemplate.name,
                    newTemplate.version,
                    newTemplate.deploymentStatus
                );
            }
        } catch (e) {
            logger.error(
                `fleet.service aggregateTemplateStatusChange: failed incrementing usage: ${e.name}`
            );
        }

        logger.debug(`fleet.service aggregateTemplateStatusChange: exit`);
    }

    public async initializeTemplateStatistics(name: string, version: number): Promise<void> {
        logger.debug(
            `fleet.service initializeTemplateStatistics: in: name:${name}, version:${version} `
        );

        ow(name, ow.string.nonEmpty);
        ow(version, ow.number.positive);

        try {
            await this.dao.initializeTemplateStatistics(name, version);
        } catch (e) {
            logger.error(
                `fleet.service initializeTemplateStatistics: failed initializong template statistics: ${e.name}`
            );
        }

        logger.debug(`fleet.service initializeTemplateStatistics: exit`);
    }
}

export interface TemplateAttributes {
    name: string;
    version: number;
    deploymentStatus?: 'IN_PROGRESS' | 'SUCCEEDED' | 'FAILED' | string;
}
