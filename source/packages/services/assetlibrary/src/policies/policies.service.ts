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
import { PolicyModel} from './policies.models';

export interface PoliciesService {

    get(policyId:string): Promise<PolicyModel> ;

    create(model: PolicyModel) : Promise<string> ;

    update(updated:PolicyModel) : Promise<string> ;

    listInheritedByDevice(deviceId:string, type:string): Promise<PolicyModel[]> ;

    listInheritedByGroup(groupPaths:string[], type?:string): Promise<PolicyModel[]> ;

    listPolicies(type?:string, offset?:number, count?:number): Promise<PolicyModel[]> ;

    delete(policyId: string) : Promise<void> ;

}
