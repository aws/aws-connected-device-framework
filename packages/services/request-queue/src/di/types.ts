/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const TYPES = {

  ReplayService: Symbol.for('ReplayService'),

  SQS: Symbol.for('SQS'),
  SQSFactory: Symbol.for('Factory<SQS>'),
  Lamba: Symbol.for('Lambda'),
  LambdaFactory: Symbol.for('Factory<Lambda>')
};
