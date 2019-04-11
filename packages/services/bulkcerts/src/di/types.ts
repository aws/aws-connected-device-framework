/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    Controller: Symbol.for('Controller'),

    CertificatesService: Symbol.for('CertificatesService'),
    CertificatesDao: Symbol.for('CertificatesDao'),

    CertificatesTaskService: Symbol.for('CertificatesTaskService'),
    CertificatesTaskDao: Symbol.for('CertificatesTaskDao'),

    DynamoDB: Symbol.for('DynamoDB'),
    DynamoDBFactory: Symbol.for('Factory<DynamoDB>'),

    SNS: Symbol.for('SNS'),
    SNSFactory: Symbol.for('Factory<SNS>'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),
    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    SSM: Symbol.for('SSM'),
    SSMFactory: Symbol.for('Factory<SSM>')
};
