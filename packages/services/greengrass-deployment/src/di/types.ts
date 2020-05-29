/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    ActivationService: Symbol.for('ActivationService'),
    ActivationDao: Symbol.for('ActivationDao'),

    AgentlessDeploymentService: Symbol.for('AgentlessDeploymentService'),
    AgentbasedDeploymentService: Symbol.for('AgentbasedDeploymentService'),
    AgentbasedDeploymentDao: Symbol.for('AgentbasedDeploymentDao'),

    SSMService: Symbol.for('SSMService'),

    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    DeploymentDao: Symbol.for('DeploymentDao'),
    DeploymentService: Symbol.for('DeploymentService'),
    DeploymentManager: Symbol.for('DeploymentManager'),

    DeploymentTemplatesService: Symbol.for('DeploymentTemplatesService'),
    DeploymentTemplateDao: Symbol.for('DeploymentTemplateDao'),

    DynamoDbUtils: Symbol.for('DynamoDbUtils'),

    SNS: Symbol.for('SNS'),
    SNSFactory: Symbol.for('Factory<SNS>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    SSM: Symbol.for('SSM'),
    SSMFactory: Symbol.for('Factory<SSM>'),

    SQS: Symbol.for('SQS'),
    SQSFactory: Symbol.for('Factory<SQS>')

};
