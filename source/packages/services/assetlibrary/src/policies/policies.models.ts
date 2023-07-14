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
export class PolicyModel {
    policyId: string;
    type: string;
    description: string;
    appliesTo: string[] = [];
    document: string;
}

export interface PolicyListModel {
    results: PolicyModel[];
    pagination?: {
        offset: number;
        count: number;
    };
}

export class Policy {
    policy: {
        id: string;
        type: string;
        policyId: string[];
        description: string[];
        document: string[];
    };
    groups: {
        id: string;
        label: string;
    }[];
}
export class AttachedPolicy extends Policy {
    policyGroups: {
        id: string;
        label: string;
    }[];
}
