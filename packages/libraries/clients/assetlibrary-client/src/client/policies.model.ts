/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { Pagination } from './pagination.model';

/**
 * Connected Device Framework: Dashboard Facade
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
