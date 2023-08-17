/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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

import { ComponentItem } from '../components/components.model';

export type Manifest = {
    region: string;
    version: string;
    resources: StackSetResource[];
};

export interface Parameter {
    parameter_key: string;
    parameter_value: string;
}

export interface DeploymentTarget {
    accounts: string[];
}

export interface StackSetResource {
    name: string;
    description: string;
    resource_file: string;
    deploy_method: 'stack_set' | 'scp';
    regions: string[];
    deployment_targets: DeploymentTarget;
    parameters: Parameter[];
}

export interface OrganizationalUnitRegionResource {
    organizationalUnitId: string;
    region: string;
    accounts: string[];
}

export type OrganizationalUnitRegionResourceList = OrganizationalUnitRegionResource[];

export interface AccountsByRegionListMap {
    [regionListKey: string]: {
        accounts: string[];
    };
}
export interface RegionListByOrganizationalUnitMap {
    [organizationalUnitId: string]: AccountsByRegionListMap;
}
export interface ComponentsByOrganizationalUnitMap {
    [organizationalUnitId: string]: ComponentItem[];
}
