/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export enum TypeCategory {
    Group = 'group',
    Device = 'device',
    Component = 'component',
    Policy = 'policy',
    Profile = 'profile'
}

export enum Operation {
    UPDATE, CREATE
}
