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
import { inject, injectable } from 'inversify';
import { TYPES } from '../di/types';
import { ManifestDao } from './manifest.dao';
import { ManifestAssembler } from './manifest.assembler';
import yaml from 'js-yaml';
import JSZip from 'jszip';
import { OrganizationalUnitsDao } from '../organizationalUnits/organizationalUnits.dao';
import { Manifest, ComponentsByOrganizationalUnitMap } from './manifest.model';
import { logger } from '@awssolutions/simple-cdf-logger';
import { ComponentsDao } from '../components/components.dao';
import { PutObjectRequest } from 'aws-sdk/clients/s3';

@injectable()
export class ManifestService {
    private _s3: AWS.S3;

    constructor(
        @inject(TYPES.ManifestDao) private templatesDao: ManifestDao,
        @inject(TYPES.ComponentsDao) private componentsDao: ComponentsDao,
        @inject(TYPES.OrganizationalUnitsDao)
        private organizationalUnitsDao: OrganizationalUnitsDao,
        @inject(TYPES.ManifestAssembler) private templatesAssembler: ManifestAssembler,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject('aws.s3.controltower.bucket') private bucket: string,
        @inject('aws.s3.controltower.prefix') private prefix: string,
        @inject('aws.s3.controltower.filename') private filename: string,
    ) {
        this._s3 = s3Factory();
    }

    public async updateManifestFile(): Promise<void> {
        logger.debug(`manifest.service updateStackSetConfiguration: in:`);
        const manifest = await this.getComponentsManifest();
        const asYaml = yaml
            .dump(manifest, { noRefs: true, lineWidth: 300 })
            .replace('VERSION_PLACEHOLDER', '2021-03-15');
        const jszip = new JSZip();
        jszip.file('manifest.yaml', asYaml);
        const zipStream = jszip.generateNodeStream({ type: 'nodebuffer', streamFiles: true });
        await this.uploadStreamToS3(zipStream);
        logger.debug(`manifest.service updateStackSetConfiguration: out:`);
    }

    private async assembleComponentsByOrganizationalUnitMap(
        organizationalUnits: string[],
    ): Promise<ComponentsByOrganizationalUnitMap> {
        logger.debug(
            `manifest.service assembleComponentsByOrganizationalUnitMap: in: organizationalUnits:${JSON.stringify(
                organizationalUnits,
            )}`,
        );
        const map = {};
        for (const ouName of organizationalUnits) {
            const components = await this.componentsDao.getComponentsByOu(ouName);
            map[ouName] = components;
        }
        logger.debug(
            `manifest.service assembleComponentsByOrganizationalUnitMap: exit: map:${JSON.stringify(
                map,
            )}`,
        );
        return map;
    }

    public async getComponentsManifest(): Promise<Manifest> {
        logger.debug(`manifest.service getComponentsManifests: in:`);
        const organizationalUnitItems = await this.organizationalUnitsDao.getOrganizationalUnits();
        const componentsMap = await this.assembleComponentsByOrganizationalUnitMap(
            organizationalUnitItems.map((o) => o.id),
        );
        const accountsRegionsMap = await this.templatesDao.getRegionAccountForOus(
            organizationalUnitItems.map((o) => o.id),
        );
        const manifest = this.templatesAssembler.toManifest(componentsMap, accountsRegionsMap);
        logger.debug(`manifest.service getComponentsManifests: out: ${JSON.stringify(manifest)}`);
        return manifest;
    }

    private async uploadStreamToS3(body: NodeJS.ReadableStream): Promise<string> {
        const configurationKey =
            this.prefix === '' ? this.filename : `${this.prefix}/${this.filename}`;
        logger.debug(
            `manifest.service uploadStreamToS3: in: bucket: ${this.bucket} key: ${configurationKey}`,
        );
        return new Promise((resolve: any, reject: any) => {
            const params: PutObjectRequest = {
                ACL: 'bucket-owner-full-control',
                Bucket: this.bucket,
                Key: configurationKey,
                Body: body,
            };

            this._s3.upload(params, (err: any, data: any) => {
                if (err) {
                    logger.debug(`manifest.service uploadStreamToS3: out: ${err}`);
                    return reject(err);
                }
                const eTag = data.ETag;
                logger.debug(`manifest.service uploadStreamToS3: out: eTag: ${eTag}`);
                return resolve(eTag);
            });
        });
    }
}
