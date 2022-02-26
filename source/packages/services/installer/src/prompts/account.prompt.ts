import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';
import { IoTClient, DescribeEndpointCommand } from '@aws-sdk/client-iot'

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

export function awsAccountIdPrompt(initial?: string) {
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

export function awsRegionPrompt(initial?: string) {
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
