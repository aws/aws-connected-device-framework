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
import { DynamoDBTarget } from './targets/dynamodb.target';
import { RawAlert, TargetItems } from './alerts/models';
import { AlertAssembler } from './alerts/assembler';

const sns: SNSTarget = container.get(TYPES.SNSTarget);
const ddbTarget: DynamoDBTarget = container.get(TYPES.DynamoDBTarget);
const messageCompiler: MessageCompilerService = container.get(TYPES.MessageCompilerService);
const assembler: AlertAssembler = container.get(TYPES.AlertAssembler);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
exports.handler = async (event: any, _context: unknown) => {
    logger.debug(`handler: event: ${JSON.stringify(event)}`);

    // review all the incoming records
    for (const rec of event.Records) {

        const rawAlert = rec.dynamodb.NewImage as RawAlert;

        // not interested in anything other than new images with target info
        if (shouldDiscard(rawAlert)) {
            continue;
        }

        const alert = assembler.assembleAlert(rawAlert);

        // hoist remaining attributes that may be useful for message compilation later
        const alertAttributes: { [key: string]: string } = {};
        Object.keys(alert)
            .filter(key => key !== 'targets' && key !== 'gsi2Key' && key !== 'gsi2Sort' && key !== 'version')
            .forEach(key => alertAttributes[key] = alert[key]);

        // Merge template property data for use by message compilation
        if (alertAttributes.templatePropertiesData) {
            Object.keys(alertAttributes.templatePropertiesData).forEach(k => {
                alertAttributes[k] = alertAttributes.templatePropertiesData[k];
            });
        }
        logger.debug(`handler: alertAttributes: ${JSON.stringify(alertAttributes)}`);

        const eventId = alertAttributes['eventId'];

        await processSnsTargets(eventId, alert.targets, alertAttributes);

        await processDynamoDbTargets(eventId, alert.targets, alertAttributes);

        // TODO: add rest of non-sns destination types when we support them
    }
};

function shouldDiscard(r:RawAlert): boolean {
    if (r.targets===undefined) {
        return true;
    }
    if (Object.keys(r.targets.M).length === 0) {
        return true;
    }
    return false;
}

async function processSnsTargets(eventId:string, targets:TargetItems, alertAttributes:{ [key: string]: string } ): Promise<void> {
    // build the messages for each target type
    const messages = new SNSMessages();

    if (targets?.email?.length>0) {
        messages.email = await messageCompiler.compile(eventId, 'email', alertAttributes);
    }
    if (targets?.sms?.length>0) {
        messages.default = await messageCompiler.compile(eventId, 'sms', alertAttributes);
    }
    if (targets?.push_gcm?.length>0) {
        messages.GCM = await messageCompiler.compile(eventId, 'push_gcm', alertAttributes);
    }
    if (targets?.push_adm?.length>0) {
        messages.ADM = await messageCompiler.compile(eventId, 'push_adm', alertAttributes);
    }
    if (targets?.push_apns?.length>0) {
        messages.APNS = await messageCompiler.compile(eventId, 'push_apns', alertAttributes);
    }
    // TODO: add rest of sns destination types when we support them

    // send if we have a message defined as part of a subscribed target
    if (messages.hasMessage() && alertAttributes['snsTopicArn'] !== 'undefined') {
        await sns.send(alertAttributes['snsTopicArn'], alertAttributes['eventName'], messages);
    }
}

async function processDynamoDbTargets(eventId:string, targets:TargetItems, alertAttributes:{ [key: string]: string }) : Promise<void> {
    // Process dynamodb target
    if (targets?.dynamodb?.length>0) {
        for(const ddb of targets.dynamodb) {
            if(ddb.tableName === undefined) {
                logger.error(`handler: unknown dynamodb tablename for eventId: ${eventId} ignoring...`);
                return;
            }

            // Check if attribute mapping exists, otherwise ignore
            if(ddb.attributeMapping === undefined) {
                logger.error(`handler: unknown dynamodb attribute mapping for eventId: ${eventId} ignoring...`);
                return;
            }

            // Construct ddb record by using attribute mapping
            const finalRecord = await messageCompiler.compileDynamodbRecord(eventId, alertAttributes, ddb.attributeMapping);

            // Write record to target table
            if (finalRecord) {
                await ddbTarget.writeAlert(finalRecord, ddb.tableName);
            }
        }
    }
}
