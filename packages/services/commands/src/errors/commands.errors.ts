/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export class InvalidArgumentError extends Error {
    public readonly argumentName: string;
    constructor(argumentName: string, message?: string) {
      super(message);
      this.argumentName = argumentName;
      this.name = 'InvalidArgumentError';
    }
}
