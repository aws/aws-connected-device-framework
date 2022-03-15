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
import { RDSClient, DescribeOrderableDBInstanceOptionsCommand } from '@aws-sdk/client-rds';

async function fetchNeptuneInstancetypes(
  region: string,
  neptuneEngineVersion: string
): Promise<string[]> {
  try {
    const client = new RDSClient({ region: region });
    const command = new DescribeOrderableDBInstanceOptionsCommand({
      Engine: 'neptune',
      EngineVersion: neptuneEngineVersion,
    });
    const data = await client.send(command);
    return (data?.OrderableDBInstanceOptions ?? [])
      .map((prod) => prod?.DBInstanceClass ?? '')
      .filter((it) => it !== '');
  } catch (err) {
    console.warn(
      `Error while trying to fetch list of available Neptune instance types from AWS Pricing API. Will proceed without list. Error was: ${err}`
    );
    return [];
  }
}

function tshirtStrToNumber(str: string): number {
  // returns bigger numbers for bigger instance type names, for use as comparison function
  const basics = ['nano', 'micro', 'small', 'medium', 'large', 'xlarge'];
  const basicsIdx = basics.indexOf(str);
  if (basicsIdx >= 0) return basicsIdx;
  const xlargeMatch = str.match(/(\d+)xlarge/);
  if (xlargeMatch !== null && xlargeMatch.length === 2 && !isNaN(parseInt(xlargeMatch[1])))
    return parseInt(xlargeMatch[1], 10) + basics.length;
  return -1;
}

export function compareNeptuneInstancetypeNames(p1: string, p2: string): number {
  const [_1, p1gen, p1tshirt] = p1.split('.');
  const [_2, p2gen, p2tshirt] = p2.split('.');
  if (p1gen != p2gen) return p1gen.localeCompare(p2gen);
  const p1tshirtNo = tshirtStrToNumber(p1tshirt);
  const p2tshirtNo = tshirtStrToNumber(p2tshirt);
  return p1tshirtNo - p2tshirtNo;
}

export async function getNeptuneInstancetypeList(
  region: string,
  engineVersion: string
): Promise<string[]> {
  try {
    const itList = await fetchNeptuneInstancetypes(region, engineVersion);
    return itList.sort(compareNeptuneInstancetypeNames);
  } catch (err) {
    console.warn(
      `Error while trying to fetch list of available Neptune instance types from RDS API. Will proceed without list. Error was: ${err}`
    );
    return [];
  }
}
