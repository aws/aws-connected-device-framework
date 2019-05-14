/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Response } from 'express';

export class HttpHeaderUtils {

    public addLink(res:Response, rel:RelType, link:string) {
        const header = (res.getHeader('link')===undefined) ? '': `${res.getHeader('link')},`;
        res.setHeader('link', `${header}<${link}>; rel="${rel}"`);
    }
}

export enum RelType {
    next,
    last,
    first,
    prev
}
