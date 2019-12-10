/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    CachableDocumentClient:  Symbol.for('CachableDocumentClient'),
    CachableDocumentClientFactory:  Symbol.for('Factory<CachableDocumentClient>'),

    DocumentClient:  Symbol.for('DocumentClient'),
    DocumentClientFactory:  Symbol.for('Factory<DocumentClient>'),

    MessageCompilerService: Symbol.for('MessageCompilerService'),
    MessageCompilerDao: Symbol.for('MessageCompilerDao'),

    SNSTarget: Symbol.for('SNSTarget'),
    DynamoDBTarget: Symbol.for('DynamoDBTarget'),

    SNS:  Symbol.for('SNS'),
    SNSFactory:  Symbol.for('Factory<SNS>'),

    DynamoDbTargetDao: Symbol.for('DynamoDbTargetDao')
};
