/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    TemplatesService: Symbol.for('TemplatesService'),
    TemplatesAssembler: Symbol.for('TemplatesAssembler'),
    TemplatesDao: Symbol.for('TemplatesDao'),

    GroupsService: Symbol.for('GroupsService'),
    GroupsAssembler: Symbol.for('GroupsAssembler'),
    GroupsDao: Symbol.for('GroupsDao'),

    DevicesService: Symbol.for('DevicesService'),
    DevicesAssembler: Symbol.for('DevicesAssembler'),
    DevicesDao: Symbol.for('DevicesDao'),

    DeploymentsService: Symbol.for('DeploymentsService'),
    DeploymentsAssembler: Symbol.for('DeploymentsAssembler'),
    DeploymentsDao: Symbol.for('DeploymentsDao'),

    SubscriptionsService: Symbol.for('SubscriptionsService'),

    CreateGroupVersionDeviceAssociationHandler: Symbol.for('CreateGroupVersionDeviceAssociationHandler'),
    ExistingAssociationDeviceAssociationHandler: Symbol.for('ExistingAssociationDeviceAssociationHandler'),
    GetPrincipalDeviceAssociationHandler: Symbol.for('GetPrincipalDeviceAssociationHandler'),
    GetThingDeviceAssociationHandler1: Symbol.for('GetThingDeviceAssociationHandler1'),
    GetThingDeviceAssociationHandler2: Symbol.for('GetThingDeviceAssociationHandler2'),
    CoreConfigHandler: Symbol.for('CoreConfigHandler'),
    ProvisionThingDeviceAssociationHandler: Symbol.for('ProvisionThingDeviceAssociationHandler'),
    SaveGroupDeviceAssociationHandler: Symbol.for('SaveGroupDeviceAssociationHandler'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),
    S3Utils: Symbol.for('S3Utils'),
    GreengrassUtils: Symbol.for('GreengrassUtils'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),

    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    Greengrass: Symbol.for('Greengrass'),
    GreengrassFactory: Symbol.for('Factory<Greengrass>')

};
