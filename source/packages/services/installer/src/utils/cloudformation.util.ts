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
import { CloudFormationClient, DeleteStackCommand, DescribeStacksCommand, ListStackResourcesCommand, Output, Parameter, StackResourceSummary, waitUntilStackDeleteComplete } from '@aws-sdk/client-cloudformation';

const inMemoryStackOutputs: { [key: string]: Output[] } = {}
const inMemoryStackResourceSummaries: { [key: string]: StackResourceSummary[] } = {}
const inMemoryStackParameters: { [key: string]: Parameter[] } = {}

type GetCloudFormationStackDetail = (key: string) => string

const getStackOutputs = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });

    if (!inMemoryStackOutputs[stackName]) {
        const response = await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
        inMemoryStackOutputs[stackName] = response.Stacks[0].Outputs
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackOutputs[stackName].find(r => r.OutputKey === key)?.OutputValue;
    }
    return getStackResourceId
}

const getStackResourceSummaries = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });

    if (!inMemoryStackResourceSummaries[stackName]) {
        const resources = await cloudformation.send(new ListStackResourcesCommand({
            StackName: stackName
        }));
        inMemoryStackResourceSummaries[stackName] = resources.StackResourceSummaries
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackResourceSummaries[stackName].find(r => r.LogicalResourceId === key)?.PhysicalResourceId;
    }
    return getStackResourceId
}

const getStackParameters = async (stackName: string, region: string): Promise<GetCloudFormationStackDetail> => {
    const cloudformation = new CloudFormationClient({ region });


    if (!inMemoryStackParameters[stackName]) {
        const stack = await cloudformation.send(new DescribeStacksCommand({
            StackName: stackName
        }));
        inMemoryStackParameters[stackName] = stack.Stacks[0].Parameters
    }

    const getStackResourceId = (key: string): string => {
        return inMemoryStackParameters[stackName].find(p => p.ParameterKey === key)?.ParameterValue;
    }
    return getStackResourceId
}


const deleteStack = async (stackName: string, region: string): Promise<void> => {
    const cloudformation = new CloudFormationClient({ region });
    try {
        await cloudformation.send(new DescribeStacksCommand({ StackName: stackName }))
        await cloudformation.send(new DeleteStackCommand({ StackName: stackName }));
        await waitUntilStackDeleteComplete({ client: cloudformation, maxWaitTime: 30 * 60 }, { StackName: stackName })
    }
    catch (Exception) {
        console.log(`Stack ${stackName} does not exist, error: ${Exception}`)
    }
}

export {
    deleteStack,
    getStackOutputs,
    getStackResourceSummaries,
    getStackParameters
}