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

    DynamoDB: Symbol.for('DynamoDB'),
    DynamoDBFactory: Symbol.for('Factory<DynamoDB>'),
    
    DynamoDBDocument: Symbol.for('DynamoDBDocument'),
    DynamoDBDocumentFactory: Symbol.for('Factory<DynamoDBDocument>'),
    
    Greengrassv2: Symbol.for('Greengrassv2'),
    Greengrassv2Factory: Symbol.for('Factory<Greengrassv2>'),
    
    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),
    
    Lambda: Symbol.for('Lambda'),
    LambdaFactory: Symbol.for('Factory<Lambda>'),
    
    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    
    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>'),
}
