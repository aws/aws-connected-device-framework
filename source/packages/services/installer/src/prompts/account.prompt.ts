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
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot';
import { Question } from 'inquirer';

export async function getCurrentAwsAccountId(region: string): Promise<string> {
  const sts = new STSClient({ region });
  const r = await sts.send(new GetCallerIdentityCommand({}));
  return r?.Account;
}


export async function getCurrentIotCredentialEndpoint(region: string): Promise<string> {
  const iot = new IoTClient({ region });
  const r = await iot.send(new DescribeEndpointCommand({ endpointType: 'iot:CredentialProvider' }));
  return r?.endpointAddress;
}
export async function getCurrentIotEndpoint(region: string): Promise<string> {
  const iot = new IoTClient({ region });
  const r = await iot.send(new DescribeEndpointCommand({ endpointType: 'iot:Data-ATS' }));
  return r?.endpointAddress;
}

export function awsAccountIdPrompt(initial?: string): Question {
  return {
    message: 'Enter the AWS Account Id:',
    type: 'input',
    name: 'accountId',
    default: initial,
    askAnswered: true,
    validate(answer: string) {
      if (answer?.length === 0) {
        return 'You must enter the AWS Account Id.';
      }
      return true;
    },
  };
}

export function awsRegionPrompt(initial?: string): Question {
  return {
    message: 'Enter the AWS Region:',
    type: 'input',
    name: 'region',
    default: initial,
    askAnswered: true,
    validate(answer: string) {
      if (answer?.length === 0) {
        return 'You must enter the AWS Region.';
      }
      return true;
    },
  };
}
