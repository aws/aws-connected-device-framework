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

    ActivationAssembler: Symbol.for('ActivationAssembler'),
    ActivationService: Symbol.for('ActivationService'),
    ActivationDao: Symbol.for('ActivationDao'),

    AgentbasedPatchService: Symbol.for('AgentbasedPatchService'),
    AgentbasedPatchDao: Symbol.for('AgentbasedPatchDao'),

    SSMService: Symbol.for('SSMService'),

    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    PatchTaskService: Symbol.for('PatchTaskService'),
    PatchTaskAssembler: Symbol.for('PatchTaskAssembler'),
    PatchTaskDao: Symbol.for('PatchTask'),

    PatchDao: Symbol.for('PatchDao'),
    PatchService: Symbol.for('PatchService'),
    PatchManager: Symbol.for('PatchManager'),
    PatchAssembler: Symbol.for('PatchAssembler'),

    PatchTemplatesService: Symbol.for('PatchTemplatesService'),
    PatchTemplateDao: Symbol.for('PatchTemplateDao'),
    PatchTemplateAssembler: Symbol.for('PatchTemplateAssembler'),

    ExpressionParser: Symbol.for('ExpressionParser'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),
    IotUtil: Symbol.for('IotUtil'),

    SNS: Symbol.for('SNS'),
    SNSFactory: Symbol.for('Factory<SNS>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    S3Utils: Symbol.for('S3Utils'),

    SSM: Symbol.for('SSM'),
    SSMFactory: Symbol.for('Factory<SSM>'),

    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>')

};
