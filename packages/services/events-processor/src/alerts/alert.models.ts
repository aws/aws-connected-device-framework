/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class AlertItem {
    time: string;

    subscription: {
        id: string;
    };

    targets?: {
        sns?: {
            arn: string;
        };
        iotCore?: {
            topic: string;
        };
    };

    event: {
        id: string;
        name: string;
    };

    user: {
        id: string;
    };
}
