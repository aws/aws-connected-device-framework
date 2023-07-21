/*********************************************************************************************************************
 *  Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the'license' file accompanying this file. This file is distributed on an'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/
import { compareNeptuneInstancetypeNames } from './instancetypes';

describe('compareNeptuneInstancetypes', () => {
    it('should sort instance types by instanceFamily and tshirt size', async () => {
        const sorted = [
            'db.r5.large',
            'db.r5.xlarge',
            'db.r5.2xlarge',
            'db.r5.4xlarge',
            'db.r5.8xlarge',
            'db.r5.12xlarge',
            'db.r5.16xlarge',
            'db.r5.24xlarge',
            'db.r5d.large',
            'db.r5d.xlarge',
            'db.r5d.2xlarge',
            'db.r5d.4xlarge',
            'db.r5d.8xlarge',
            'db.r5d.12xlarge',
            'db.r5d.24xlarge',
            'db.r6g.large',
            'db.r6g.xlarge',
            'db.r6g.2xlarge',
            'db.r6g.4xlarge',
            'db.r6g.8xlarge',
            'db.r6g.12xlarge',
            'db.r6g.16xlarge',
            'db.t3.medium',
            'db.t4g.medium',
        ];

        const shuffled = [
            'db.r6g.8xlarge',
            'db.r5d.12xlarge',
            'db.r5.large',
            'db.r5d.xlarge',
            'db.r6g.12xlarge',
            'db.r5d.8xlarge',
            'db.r6g.large',
            'db.r5d.4xlarge',
            'db.r6g.4xlarge',
            'db.r5d.2xlarge',
            'db.r6g.16xlarge',
            'db.r5.16xlarge',
            'db.r5d.large',
            'db.t4g.medium',
            'db.r6g.xlarge',
            'db.t3.medium',
            'db.r5.4xlarge',
            'db.r5.8xlarge',
            'db.r5.xlarge',
            'db.r5.2xlarge',
            'db.r5d.24xlarge',
            'db.r5.12xlarge',
            'db.r5.24xlarge',
            'db.r6g.2xlarge',
        ];

        shuffled.sort(compareNeptuneInstancetypeNames);
        expect(shuffled).toEqual(sorted);
    });
});
