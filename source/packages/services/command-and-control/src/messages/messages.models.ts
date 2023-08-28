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
import { SearchRequestModel } from '@awssolutions/cdf-assetlibrary-client';

export interface NewMessageResource {
    commandId: string;
    payloadParamValues?: TokenValues;
    targets?: Targets;
}
export interface MessageResource extends NewMessageResource {
    id?: string;
    status?: MessageStatus;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface MessageItem {
    id?: string;
    commandId: string;
    payloadParamValues?: TokenValues;
    targets?: Targets;

    status?: MessageStatus;
    statusMessage?: string;

    resolvedTargets?: Recipient[];

    batchesTotal?: number;
    batchesComplete?: number;

    createdAt?: number;
    updatedAt?: number;

    bulkProvisioningTaskId?: string;
}

export interface Targets {
    awsIoT?: {
        thingNames?: string[];
        thingGroups?: {
            name: string;
            expand?: boolean;
        }[];
    };
    assetLibrary?: {
        deviceIds?: string[];
        groupPaths?: string[];
        query?: SearchRequestModel;
    };
}

export type ResolvedTargetStatus = 'pending' | 'success' | 'failed';

export interface Recipient {
    id: string;
    type: 'thing' | 'thingGroup';
    status: ResolvedTargetStatus;
    statusMessage?: string;
    correlationId?: string;
    jobId?: string;
}

export interface RecipientList {
    recipients: Recipient[];
    pagination?: {
        lastEvaluated?: {
            thingName: string;
        };
        count?: number;
    };
}

export interface ReplyResource {
    receivedAt: Date;
    action: string;
    payload: unknown;
}

export interface ReplyItem {
    receivedAt: Date;
    action: string;
    payload: unknown;

    pk?: string;
    sk?: string;
}

export interface ReplyResourceList {
    replies: ReplyResource[];
    pagination?: {
        lastEvaluated?: {
            receivedAt: number;
        };
        count?: number;
    };
}

export type MessageStatus =
    | 'identifying_targets'
    | 'awaiting_provisioning'
    | 'sending'
    | 'awaiting_replies'
    | 'success'
    | 'failed';

export interface TokenValues {
    [key: string]: string | number | boolean;
}

export interface MessageResourceList {
    messages: MessageResource[];
    pagination?: {
        lastEvaluated?: {
            createdAt: number;
        };
        count?: number;
    };
}

export type MessageListPaginationKey = {
    createdAt: number;
};

export type RecipientListPaginationKey = {
    targetName: string;
};

export type RecipientType = 'thing' | 'thingGroup';

export type ReplyListPaginationKey = {
    receivedAt: number;
};
export interface TaskBatchProgress {
    complete: number;
    total: number;
}
