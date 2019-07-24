/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

export class PathHelper {
    public static encodeUrl(...paths: string[]): string {
        return paths.map(p=> encodeURIComponent(p)).join('/');
    }
}
