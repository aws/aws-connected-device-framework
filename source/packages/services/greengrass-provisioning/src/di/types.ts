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
export const TYPES = {

    TemplatesService: Symbol.for('TemplatesService'),
    TemplatesAssembler: Symbol.for('TemplatesAssembler'),
    TemplatesDao: Symbol.for('TemplatesDao'),

    GroupsService: Symbol.for('GroupsService'),
    GroupsAssembler: Symbol.for('GroupsAssembler'),
    GroupsDao: Symbol.for('GroupsDao'),

    GroupTasksService: Symbol.for('GroupTasksService'),
    GroupTasksAssembler: Symbol.for('GroupTasksAssembler'),
    GroupTasksDao: Symbol.for('GroupTasksDao'),

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
