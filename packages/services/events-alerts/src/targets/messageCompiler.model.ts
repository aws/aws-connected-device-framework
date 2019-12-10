/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export class MessageTemplates {
    supportedTargets: SupportedTargets= {};
    templates: Templates= {};
}

export type AttributeMapping = { [key: string] : string};
export type SupportedTargets = {[key:string]:string};
export type Templates = {[key:string]:string};
