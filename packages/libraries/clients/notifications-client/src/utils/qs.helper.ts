/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import * as qs from 'querystring';

export class QSHelper {
    public static getQueryString(queryObject:any): string {
        let qsObj: any = null;
        for(const key of Object.keys(queryObject)) {
            if(queryObject[key]) {
                if(typeof(queryObject[key]) === 'string') {
                    if(queryObject[key].length > 0) {
                        qsObj = {};
                        qsObj[key] = queryObject[key];
                    }
                } else {
                    qsObj = {};
                    qsObj[key] = queryObject[key];
                }
            }
        }
        if(qsObj) {
            return qs.stringify(qsObj);
        }
        return null;
    }
}
