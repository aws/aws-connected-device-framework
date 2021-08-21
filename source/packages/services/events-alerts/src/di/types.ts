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

    CachableDocumentClient:  Symbol.for('CachableDocumentClient'),
    CachableDocumentClientFactory:  Symbol.for('Factory<CachableDocumentClient>'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    MessageCompilerService: Symbol.for('MessageCompilerService'),
    MessageCompilerDao: Symbol.for('MessageCompilerDao'),

    AlertAssembler: Symbol.for('AlertAssembler'),

    SNSTarget: Symbol.for('SNSTarget'),
    DynamoDBTarget: Symbol.for('DynamoDBTarget'),

    SNS:  Symbol.for('SNS'),
    SNSFactory:  Symbol.for('Factory<SNS>'),

    DynamoDbTargetDao: Symbol.for('DynamoDbTargetDao')
};
