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
export interface Parameter {
    key: string;
    value: string;
}

export interface ComponentItem {
    organizationalUnitId: string;
    name: string;
    description: string;
    runOrder: number;
    resourceFile: string;
    parameters: { [key: string]: string };
    bypassCheck?: boolean;
}

export type ComponentResource = Omit<ComponentItem, 'organizationalUnitId'>;

export type ComponentResourceList = ComponentResource[];

export class BulkComponentsResource {
    components: ComponentResource[];
}
export class BulkComponentsResult {
    success: number;
    failed: number;
    total: number;
    errors: { [key: string]: string };
}
