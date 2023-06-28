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
import { Response } from 'express';
import { SchemaValidationResult, ValidateRelationshipsByIdsResult } from '../types/schemaValidator.full.service';
import { logger } from './logger';

export function handleError(e: Error, res: Response): void {
    logger.error(`handleError: ${e}`);

    let status: number;
    let json: unknown = { error: e.message };
    switch (e.name) {
        case 'SchemaValidationError': {
            status = 400;
            json = {
                error: res.statusMessage,
                errors: (e as SchemaValidationError).errors,
            };
            break;
        }
        case 'RelationValidationError': {
            status = 400;
            const ive = e as RelationValidationError;
            json = {
                error: res.statusMessage,
                invalidDeviceIds: ive.issues.invalidDeviceIds,
                invalidGroupPaths: ive.issues.invalidGroupPaths,
                invalidRelations: ive.issues.invalidRelations,
            };
            break;
        }
        case 'InvalidCategoryError':
        case 'InvalidQueryStringError':
        case 'ArgumentError':
        case 'TypeError':
            status = 400;
            json = { error: e.message };
            break;

        case 'NotAuthorizedError':
            status = 403;
            break;

        case 'NotFoundError':
        case 'TemplateNotFoundError':
        case 'ProfileNotFoundError':
        case 'DeviceNotFoundError':
        case 'GroupNotFoundError':
            status = 404;
            json = { error: e.message };
            break;

        case 'TemplateInUseError':
            status = 409;
            break;

        case 'ConditionalCheckFailedException':
        case 'ResourceAlreadyExistsException':
            status = 409;
            json = {
                error: 'Item already exists.',
            };
            break;

        case 'NotSupportedError':
            status = 501;
            break;

        default:
            if (
                e.message.indexOf('with id already exists') >= 0 // thrown by neptune
            ) {
                status = 409;
                json = {
                    error: 'Item already exists.',
                };
            } else if (
                e.hasOwnProperty('code') &&
                e['code'] === 'InvalidRequestException' // thrown by IotData in event emitter
            ) {
                status = 400;
            } else if (
                e.message.indexOf('Unexpected server response: 429') >= 0 // thrown by neptune throttle
            ) {
                status = 429;
                json = {
                    error: 'Too Many Requests',
                };
            } else if (
                e.hasOwnProperty('code') &&
                e['code'] === 'TimeLimitExceededException' // thrown when large volume of data is taking too long to retrieve
            ) {
                status = 504;
            } else {
                status = 500;
            }
    }

    logger.error(`handleError: status:${status}, json:${JSON.stringify(json)}`);
    res.status(status).json(json).end();
}

export class SchemaValidationError extends Error {
    constructor(public errors: { [dataPath: string]: string } | SchemaValidationResult) {
        super('Refer to errors for further information.');
        this.name = 'SchemaValidationError';
    }
}
export class RelationValidationError extends Error {
    constructor(public issues: ValidateRelationshipsByIdsResult) {
        super('Related devices/groups failed validation');
        this.name = 'RelationValidationError';
    }
}

export class NotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
    }
}

export class DeviceNotFoundError extends NotFoundError {
    constructor(id: string) {
        super(`Device ${id} not found.`);
        this.name = 'DeviceNotFoundError';
    }
}

export class GroupNotFoundError extends NotFoundError {
    constructor(id: string) {
        super(`Group ${id} not found.`);
        this.name = 'GroupNotFoundError';
    }
}

export class TemplateNotFoundError extends NotFoundError {
    constructor(templateName: string) {
        super(`Template ${templateName} not found.`);
        this.name = 'TemplateNotFoundError';
    }
}

export class ProfileNotFoundError extends NotFoundError {
    constructor(name: string) {
        super(`Profile ${name} not found.`);
        this.name = 'ProfileNotFoundError';
    }
}

export class InvalidCategoryError extends Error {
    constructor(category: string) {
        super(`Category ${category} invalid.`);
        this.name = 'InvalidCategoryError';
    }
}

export class TemplateInUseError extends Error {
    constructor(templateName: string) {
        super(`Template ${templateName} is in use.`);
        this.name = 'TemplateInUseError';
    }
}

export class NotSupportedError extends Error {
    constructor() {
        super(`Action not supported in this mode.`);
        this.name = 'NotSupportedError';
    }
}

export class NotAuthorizedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NotAuthorizedError';
    }
}

export class InvalidQueryStringError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InvalidQueryStringError';
    }
}

export class ArgumentError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ArgumentError';
    }
}
