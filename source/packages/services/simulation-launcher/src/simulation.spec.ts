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
import 'reflect-metadata';

import { LaunchParams, Simulation } from './simulation';

describe('LaunchSimulation', () => {
    it.skip('happy path should launch Fargate cluster', async () => {
        const instance = new Simulation('us-west-2');

        const params: LaunchParams = {
            simulationId: 'DEAN2000',
            instances: 2,
            s3RootKey: 'simulations/DEAN2000',
        };

        // execute
        await instance.launch(params);
    }, 300000);
});
