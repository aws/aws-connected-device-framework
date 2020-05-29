/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

    Controller: Symbol.for('Controller'),
    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),
    ThingsService: Symbol.for('ThingsService'),
    EventEmitter: Symbol.for('EventEmitter'),

    ClientIdEnforcementPolicyStepProcessor: Symbol.for('ClientIdEnforcementPolicyStepProcessor'),
    CreateDeviceCertificateStepProcessor: Symbol.for('CreateDeviceCertificateStepProcessor'),
    RegisterDeviceCertificateWithoutCAStepProcessor: Symbol.for('RegisterDeviceCertificateWithoutCAStepProcessor'),

    Iot: Symbol.for('Iot'),
    IotFactory: Symbol.for('Factory<Iot>'),
    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
    SSM: Symbol.for('SSM'),
    SSMFactory: Symbol.for('Factory<SSM>'),
    SNS: Symbol.for('SNS'),
    SNSFactory: Symbol.for('Factory<SNS>')
};
