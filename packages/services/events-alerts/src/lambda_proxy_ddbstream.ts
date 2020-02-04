/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger.util';
import { container } from './di/inversify.config';
import { SNSTarget, SNSMessages } from './targets/sns.target';
import { TYPES } from './di/types';
import { MessageCompilerService } from './targets/messageCompiler.service';
import { extractValue } from './utils/dynamoDb.util';
import { DynamoDBTarget } from './targets/dynamodb.target';

let sns: SNSTarget;
let ddbTarget: DynamoDBTarget;
let messageCompiler: MessageCompilerService;

exports.handler = async (event: any, _context: any) => {
    logger.debug(`handler: event: ${JSON.stringify(event)}`);

    // init
    if (sns === undefined) {
        sns = container.get(TYPES.SNSTarget);
    }
    if (ddbTarget === undefined) {
        ddbTarget = container.get(TYPES.DynamoDBTarget);
    }
    if (messageCompiler === undefined) {
        messageCompiler = container.get(TYPES.MessageCompilerService);
    }

    // review all the incoming records
    for (const rec of event.Records) {

        // not interested in anything other than new images with target info
        if (shouldDiscard(rec)) {
            continue;
        }

        const img = rec.dynamodb.NewImage;
        const targets: { [key: string]: string } = extractValue(img.targets);

        // grab all the attributes so we can use them to compile messages later
        const alertAttributes: { [key: string]: string } = {};
        Object.keys(img)
            .filter(key => key !== 'targets' && key !== 'gsi2Key' && key !== 'gsi2Sort')
            .forEach(key => alertAttributes[key] = extractValue(img[key]));

        // Merge additional attributes on the alert object, if there are any
        if (alertAttributes.templatePropertiesData) {
            Object.keys(alertAttributes.templatePropertiesData).forEach(k => {
                alertAttributes[k] = alertAttributes.templatePropertiesData[k];
            });
        }

        // Retrieve event config once and reuse
        const eventId = alertAttributes['eventId'];

        // build the messages for each target type
        const messages = new SNSMessages();

        if (targets['email'] !== undefined) {
            messages.email = await messageCompiler.compile(eventId, 'email', alertAttributes);
        }
        if (targets['sms'] !== undefined) {
            messages.default = await messageCompiler.compile(eventId, 'sms', alertAttributes);
        }
        // TODO: add rest of sns destination types when we support them

        // send if topic is not sent to undefined explicitely
        if (messages.hasMessage() && alertAttributes['snsTopicArn'] !== 'undefined') {
            await sns.send(alertAttributes['snsTopicArn'], alertAttributes['eventName'], messages);
        }

        // Process dynamodb target
        if (targets['dynamodb'] !== undefined) {
            const targetsObj = extractValue(rec.dynamodb.NewImage.targets);

            if(targetsObj.dynamodb === undefined) {
                logger.error(`handler: unknown dynamodb config for eventId: ${eventId} ignoring...`);
                continue;
            }
            const ddbObj = targetsObj.dynamodb;

            if(ddbObj.tableName === undefined) {
                logger.error(`handler: unknown dynamodb tablename for eventId: ${eventId} ignoring...`);
                continue;
            }
            const tableName = ddbObj.tableName;

            // Check if attribute mapping exists, otherwise ignore
            if(ddbObj.attributeMapping === undefined) {
                logger.error(`handler: unknown dynamodb attribute mapping for eventId: ${eventId} ignoring...`);
                continue;
            }
            const ddbAttrMapping = ddbObj.attributeMapping;

            // Construct ddb record by using attribute mapping
            const finalRecord = await messageCompiler.compileDynamodbRecord(eventId, alertAttributes, ddbAttrMapping);

            // Write record to target table
            if (finalRecord) {
                await ddbTarget.writeAlert(finalRecord, tableName);
            }
        }

        // TODO: add rest of non-sns destination types when we support them
    }
};

function shouldDiscard(rec: any): boolean {
    if (rec.dynamodb === undefined) {
        return true;
    }
    if (rec.dynamodb.NewImage === undefined) {
        return true;
    }
    if (rec.dynamodb.NewImage.targets === undefined) {
        return true;
    }
    const targets: { [key: string]: string } = extractValue(rec.dynamodb.NewImage.targets);
    if (Object.keys(targets).length === 0) {
        return true;
    }
    return false;
}
