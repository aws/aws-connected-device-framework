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
import { inject, injectable } from "inversify";
import { ComponentItem } from "../components/components.model";
import { logger } from '@awssolutions/simple-cdf-logger';
import {
    ComponentsByOrganizationalUnitMap,
    Manifest,
    RegionListByOrganizationalUnitMap,
} from "./manifest.model";

@injectable()
export class ManifestAssembler {
    constructor(
        @inject('aws.region') private region: string
    ) {
    }

    public regionListKeyToStackName(componentName: string, regionListKey: string): string {
        return `${componentName}-${regionListKey.replace(/:/, '-')}`
    }

    public regionsToStackName(componentName: string, regions: string[]): string {
        return `${componentName}-${regions.sort().join('-')}`
    }

    public toManifest(componentsMapping: ComponentsByOrganizationalUnitMap, accountsRegionMapping: RegionListByOrganizationalUnitMap): Manifest {

        logger.info(JSON.stringify(accountsRegionMapping))

        const manifest: Manifest = {
            region: this.region,
            version: 'VERSION_PLACEHOLDER',
            resources: []
        }

        logger.info(JSON.stringify(Object.entries(accountsRegionMapping)))

        for (const [key, value] of Object.entries(accountsRegionMapping)) {
            if (value !== undefined) {
                const components: ComponentItem[] = componentsMapping[key];
                for (const [regionListKey, regionListValue] of Object.entries(value)) {
                    const sortedComponents = components.sort((a, b) => a.runOrder - b.runOrder)
                    for (const component of sortedComponents) {
                        const stackSetName = this.regionListKeyToStackName(component.name, regionListKey)
                        const { parameters } = component
                        manifest.resources.push({
                            name: stackSetName,
                            description: `stack set for ${component.name}`,
                            regions: regionListKey.split(':'),
                            deployment_targets: {
                                accounts: regionListValue.accounts
                            },
                            deploy_method: "stack_set",
                            resource_file: `${component.resourceFile}`,
                            parameters: Object.keys(parameters).map(key => {
                                return {
                                    parameter_key: key,
                                    parameter_value: parameters[key]
                                }
                            })
                        })
                    }
                }
            }
        }

        return manifest;
    }
}
