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
import { RunItem } from '../runs/runs.models';

export interface SimulationItem {

    id?: string;
    name:string;
    deviceCount:number;

    status?:SimulationStatus;

    /* attribute keys and values required by the tasks */
    tasks: {
        /* an optional setup specific task */
        setup?: Task
        /* an optional pre-provisioning task  */
        provisioning?: Task,
        /* the simulation task */
        simulation: Task,
    };

    /* S3 key of any modules required by the tasks */
    modules?: StringMap;

}

export type Task = {
    /* S3 key of test plan to run */
    plan: string;
    /* all attributes required by the test plan */
    attributes: StringMap;
    /* thread information for the task */
    threads: ThreadInfo;
};

export type ThreadInfo = {
    /* total number of threads to process the entire deviceCount (total across all runner instances) */
    total: number;
    /* ramp up period (seconds) to achieve the configured no. of threads per runner instance  */
    rampUpSecs: number;
};

export type StringMap = {[key: string] : string};
export type AnyMap = {[key: string] : string};

export enum SimulationStatus {
    preparing='preparing',
    provisioning='provisioning',
    provisioned='provisioned'
}

export interface TemplateProperties {
    config: unknown;
    simulation: SimulationItem;
    run?: RunItem;
    instance: {
        id: number;
        devices: number;
        threads: number;
    };
}
