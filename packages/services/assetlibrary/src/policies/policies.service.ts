/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
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
