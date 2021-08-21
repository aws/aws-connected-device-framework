/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
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
