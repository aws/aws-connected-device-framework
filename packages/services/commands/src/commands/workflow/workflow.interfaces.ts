/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import { CommandModel } from '../commands.models';

export interface WorkflowAction {
    execute(existing:CommandModel, updated:CommandModel):Promise<boolean>;
}
