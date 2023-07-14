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
import { logger } from '@awssolutions/simple-cdf-logger';
import * as dot from 'dot';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import { v1 as uuid } from 'uuid';
import { TYPES } from '../di/types';
import { MessageCompilerDao } from './messageCompiler.dao';
import { AttributeMapping, MessageTemplates } from './messageCompiler.model';

@injectable()
export class MessageCompilerService {
    private _templateMap: { [eventId: string]: { [target: string]: dot.RenderFunction } } = {};

    public constructor(
        @inject(TYPES.MessageCompilerDao) private messageCompilerDao: MessageCompilerDao
    ) {}

    public async compile(
        eventId: string,
        targetType: string,
        attributes: { [key: string]: string | number }
    ): Promise<string> {
        logger.debug(
            `messageCompiler.service compile: in: eventId:${eventId}, targetType:${targetType}, attributes:${JSON.stringify(
                attributes
            )}`
        );

        // do we already have the requested template compiled and cached?
        let eventTemplateFns = this._templateMap[eventId];

        // if not, retrieve it from the db then compile and cache it
        if (eventTemplateFns === undefined) {
            // Retrieve event config from db
            const eventConfig: MessageTemplates = await this.messageCompilerDao.getEventConfig(
                eventId
            );
            if (eventConfig === undefined) {
                logger.error(
                    `messageCompiler.service compile: unknown eventId: ${eventId} ignoring...`
                );
                return null;
            }

            eventTemplateFns = {};
            Object.keys(eventConfig.supportedTargets).forEach((k) => {
                eventTemplateFns[k] = dot.template(
                    eventConfig.templates[eventConfig.supportedTargets[k]]
                );
            });

            logger.debug(`eventTemplateFns: ${eventTemplateFns}`);

            this._templateMap[eventId] = eventTemplateFns;
        }

        // compile and return the message
        let templateFn = eventTemplateFns[targetType];
        if (templateFn === undefined) {
            templateFn = eventTemplateFns['default'];
        }

        let message;
        try {
            message = templateFn(attributes);
        } catch (err) {
            logger.error(err);
        }

        logger.debug(`messageCompiler.service compile: exit:${message}`);
        return message;
    }

    public async compileDynamodbRecord(
        eventId: string,
        data: AttributeMapping,
        ddbAttrMapping: AttributeMapping
    ): Promise<AttributeMapping> {
        logger.info(
            `messageCompiler.service compileDynamodbRecord: in: eventId:${eventId}, data: ${JSON.stringify(
                data
            )}, ddbAttributeMapping: ${JSON.stringify(ddbAttrMapping)} `
        );

        // Validate inputs
        ow(eventId, ow.string.nonEmpty);
        ow(data, ow.object.nonEmpty);
        ow(ddbAttrMapping, ow.object.nonEmpty);

        // Retrieve event config from db
        const eventConfig: MessageTemplates = await this.messageCompilerDao.getEventConfig(
            eventId
        );

        // do we already have the requested template compiled and cached for attribute mapping?
        // if not, retrieve it from the db then compile and cache it
        let eventTemplateFns = this._templateMap[eventConfig.eventId];
        if (eventTemplateFns === undefined) {
            eventTemplateFns = {};
            Object.keys(ddbAttrMapping).forEach((key) => {
                eventTemplateFns[key] = dot.template(key);
            });

            this._templateMap[eventConfig.eventId] = eventTemplateFns;
        }

        // Add additional supported values in templates
        data['uuid'] = uuid();
        data['datetime'] = new Date().toISOString();

        const recordAttrMap: AttributeMapping = {};
        Object.keys(ddbAttrMapping).forEach((key) => {
            // const templateFn = dot.template(key);
            const templateFn = eventTemplateFns[key];

            // Set value as key to dynamodb record and evaluated string as value
            recordAttrMap[ddbAttrMapping[key]] = templateFn(data);
        });

        logger.debug(
            `messageCompiler.service compileDynamodbRecord: exit:${JSON.stringify(recordAttrMap)}`
        );
        return recordAttrMap;
    }
}
