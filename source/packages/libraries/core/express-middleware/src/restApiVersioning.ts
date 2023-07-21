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
export type SupportedVersionConfig = { [subType: string]: string[] }[];

const MIME_TYPE_PREFIX = 'application/vnd.aws-cdf-v';

export function asArray(supportedVersions: SupportedVersionConfig): string[] {
    const mimeTypes: string[] = [];
    supportedVersions.forEach((sv) => {
        Object.keys(sv).forEach((subType) => {
            sv[subType].forEach((version) => {
                const mimeType = `${MIME_TYPE_PREFIX}${version}${CdfVersionType[subType]}`;
                mimeTypes.push(mimeType);
            });
        });
    });
    return mimeTypes;
}

export function supportsAtLeastVersion(
    accept: string,
    subType: CdfVersionType,
    version?: number,
): boolean {
    if (subType === CdfVersionType.json && accept.endsWith(CdfVersionType.hal)) {
        // explicit check, as we cannot do a simple endswith check due to duplicated types ending with +json
        return false;
    }
    if (!accept.endsWith(subType)) {
        return false;
    }
    const acceptsVersion = Number(accept.replace(MIME_TYPE_PREFIX, '').replace(subType, ''));
    return acceptsVersion >= version;
}

export enum CdfVersionType {
    json = '+json',
    hal = 'hal+json',
}

export const DEFAULT_MIME_TYPE = `${MIME_TYPE_PREFIX}1.0${CdfVersionType.json}`;
