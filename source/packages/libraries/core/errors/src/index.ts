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
export class InvalidArgumentError extends Error {
    public readonly argumentName: string;
    constructor(argumentName: string, message?: string) {
        super(message);
        this.argumentName = argumentName;
        this.name = 'InvalidArgumentError';
    }
}

export class ItemAlreadyExistsError extends Error {
    public readonly itemId: string;
    constructor(itemId: string, message?: string) {
        super(message);
        this.itemId = itemId;
        this.name = 'ItemAlreadyExistsError';
    }
}

export class ItemDoesNotExistError extends Error {
    public readonly itemId: string;
    constructor(itemId: string, message?: string) {
        super(message);
        this.itemId = itemId;
        this.name = 'ItemDoesNotExistError';
    }
}

export class ConcurrentModificationError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'ConcurrentModificationError';
    }
}

export class DbError extends Error {
    public cause: any;
    constructor(dbError: any, message?: string) {
        super(message);
        this.cause = dbError;
        this.name = 'DbError';
    }
}
