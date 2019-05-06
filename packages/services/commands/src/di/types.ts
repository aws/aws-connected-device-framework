/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {
    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    TemplatesDao: Symbol.for('TemplatesDao'),
    TemplatesService: Symbol.for('TemplatesService'),

    CommandsDao: Symbol.for('CommandsDao'),
    CommandsService: Symbol.for('CommandsService'),

    PresignedUrlsService: Symbol.for('PresignedUrlsService'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    IotData: Symbol.for('IotData'),
    IotDataFactory: Symbol.for('Factory<IotData>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    WorkflowFactory: Symbol.for('WorkflowFactory'),
    InvalidTransitionAction: Symbol.for('InvalidTransitionAction'),
    StartJobAction: Symbol.for('StartJobAction'),
    SaveAction: Symbol.for('SaveAction'),
    CreateAction: Symbol.for('CreateAction')

};
