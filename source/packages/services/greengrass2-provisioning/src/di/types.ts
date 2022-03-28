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

    Controller: Symbol.for('Controller'),
    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    TemplatesDao: Symbol.for('TemplatesDao'),
    TemplatesService: Symbol.for('TemplatesService'),
    TemplatesAssembler: Symbol.for('TemplatesAssembler'),

    CoresDao: Symbol.for('CoresDao'),
    CoresService: Symbol.for('CoresService'),
    CoresAssembler: Symbol.for('CoresAssembler'),

    CoreTasksDao: Symbol.for('CoreTasksDao'),
    CoreTasksService: Symbol.for('CoreTasksService'),
    CoreTasksAssembler: Symbol.for('CoreTasksAssembler'),

    DevicesDao: Symbol.for('DevicesDao'),
    DevicesService: Symbol.for('DevicesService'),
    DevicesAssembler: Symbol.for('DevicesAssembler'),

    DeviceTasksDao: Symbol.for('DeviceTasksDao'),
    DeviceTasksService: Symbol.for('DeviceTasksService'),
    DeviceTasksAssembler: Symbol.for('DeviceTasksAssembler'),

    DeploymentTasksDao: Symbol.for('DeploymentTasksDao'),
    DeploymentTasksService: Symbol.for('DeploymentTasksService'),

    FleetDao: Symbol.for('FleetDao'),
    FleetService: Symbol.for('FleetService'),

    DeploymentsService: Symbol.for('DeploymentsService'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),
    S3Utils: Symbol.for('S3Utils'),

    DynamoDB: Symbol.for('DynamoDBV3'),
    DynamoDBFactory: Symbol.for('Factory<DynamoDBV3>'),
    
    DynamoDBDocument: Symbol.for('DynamoDBDocumentV3'),
    DynamoDBDocumentFactory: Symbol.for('Factory<DynamoDBDocumentV3>'),
    
    Greengrassv2: Symbol.for('Greengrassv2V3'),
    Greengrassv2Factory: Symbol.for('Factory<Greengrassv2V3>'),
    
    Iot: Symbol.for('IotV3'),
    IotFactory: Symbol.for('Factory<IotV3>'),
    
    Lambda: Symbol.for('LambdaV3'),
    LambdaFactory: Symbol.for('Factory<LambdaV3>'),
    
    S3: Symbol.for('S3V3'),
    S3Factory: Symbol.for('Factory<S3V3>'),
    
    SQS: Symbol.for('SQSV3'),
    SQSFactory: Symbol.for('Factory<SQSV3>'),
}
