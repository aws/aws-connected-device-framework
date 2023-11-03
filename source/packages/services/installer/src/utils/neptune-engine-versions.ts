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
const ASSUMED_NEPTUNE_ENGINE_VERSION = '1.2';
import { DescribeDBEngineVersionsCommand, NeptuneClient } from "@aws-sdk/client-neptune";

export async function fetchNeptuneEngineVersions(
    region: string,
    neptuneEngineVersion?: string
): Promise<string[]> {
    try {
        const client = new NeptuneClient({ region: region });
        const command = new DescribeDBEngineVersionsCommand({
            Engine: 'neptune',
            EngineVersion: neptuneEngineVersion ?? ASSUMED_NEPTUNE_ENGINE_VERSION,
        });
        const data = await client.send(command);
        const versions_engine = [...data.DBEngineVersions]
        const sorted_versions = versions_engine.map((item) => item["EngineVersion"]);
        return sorted_versions
    } catch (err) {
        console.warn(
            `Error while trying to fetch list of available Neptune instance types from AWS Pricing API. Will proceed without list. Error was: ${err}`
        );
        return [];
    }
}




