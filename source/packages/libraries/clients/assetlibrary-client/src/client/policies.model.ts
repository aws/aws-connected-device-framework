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
import { Pagination } from './pagination.model';

/**
 * AWS Connected Device Framework: Dashboard Facade
 */

export interface Policy {
    /**
     * Globally unique id of the Policy.
     */
    policyId: string;

    type: string;

    description:string;

    appliesTo: string[];

    document: string;
}

export interface PolicyList {
    results?: Policy[];
    pagination?: Pagination;
}
