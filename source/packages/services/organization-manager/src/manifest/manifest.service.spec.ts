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

import { logger } from '@awssolutions/simple-cdf-logger';
import AWS from 'aws-sdk';
import S3, { ManagedUpload } from 'aws-sdk/clients/s3';
import { createMockInstance } from 'jest-create-mock-instance';
import JSZip from 'jszip';
import 'reflect-metadata';
import { ComponentsDao } from '../components/components.dao';
import { ComponentItem } from '../components/components.model';
import { OrganizationalUnitsDao } from '../organizationalUnits/organizationalUnits.dao';
import { ManifestAssembler } from './manifest.assembler';
import { ManifestDao } from './manifest.dao';
import { ManifestService } from './manifest.service';

const expectedManifestFile = `region: ap-southeast-2
version: 2021-03-15
resources:
  - name: cfn-provisioning-ap-southeast-2
    description: stack set for cfn-provisioning
    regions:
      - ap-southeast-2
    deployment_targets:
      accounts:
        - cdf-one
    deploy_method: stack_set
    resource_file: https://cdf-organization-manager-xxxx-artifacts-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/cfn-provisioning-output.yml
    parameters: []
  - name: cfn-device-monitor-ap-southeast-2
    description: stack set for cfn-device-monitor
    regions:
      - ap-southeast-2
    deployment_targets:
      accounts:
        - cdf-one
    deploy_method: stack_set
    resource_file: s3://somebucket/somezipfile.zip
    parameters:
      - parameter_key: environment
        parameter_value: production
  - name: cfn-provisioning-ap-southeast-1
    description: stack set for cfn-provisioning
    regions:
      - ap-southeast-1
    deployment_targets:
      accounts:
        - cdf-two
    deploy_method: stack_set
    resource_file: https://cdf-organization-manager-xxxx-artifacts-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/cfn-provisioning-output.yml
    parameters: []
  - name: cfn-device-monitor-ap-southeast-1
    description: stack set for cfn-device-monitor
    regions:
      - ap-southeast-1
    deployment_targets:
      accounts:
        - cdf-two
    deploy_method: stack_set
    resource_file: s3://somebucket/somezipfile.zip
    parameters:
      - parameter_key: environment
        parameter_value: production
  - name: cfn-provisioning-us-west-1-us-west-2
    description: stack set for cfn-provisioning
    regions:
      - us-west-1
      - us-west-2
    deployment_targets:
      accounts:
        - cdf-three
        - cdf-four
    deploy_method: stack_set
    resource_file: https://cdf-organization-manager-xxxx-artifacts-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/cfn-provisioning-output.yml
    parameters: []
  - name: cfn-device-monitor-us-west-1-us-west-2
    description: stack set for cfn-device-monitor
    regions:
      - us-west-1
      - us-west-2
    deployment_targets:
      accounts:
        - cdf-three
        - cdf-four
    deploy_method: stack_set
    resource_file: s3://somebucket/somezipfile.zip
    parameters:
      - parameter_key: environment
        parameter_value: production
`;

describe('TemplatesService', function () {
    let mockedManifestDao: jest.Mocked<ManifestDao>;
    let mockedComponentsDao: jest.Mocked<ComponentsDao>;
    let mockedOrganizationalUnitsDao: jest.Mocked<OrganizationalUnitsDao>;

    let mockS3: AWS.S3;
    let instance: ManifestService;

    beforeEach(() => {
        jest.clearAllMocks();

        mockS3 = new AWS.S3();

        const mockS3Factory = () => {
            return mockS3;
        };

        mockedComponentsDao = createMockInstance(ComponentsDao);
        mockedOrganizationalUnitsDao = createMockInstance(OrganizationalUnitsDao);
        mockedManifestDao = createMockInstance(ManifestDao);

        const componentItems: ComponentItem[] = [
            {
                name: 'cfn-provisioning',
                description: 'stack set for cfn-provisioning',
                resourceFile:
                    'https://cdf-organization-manager-xxxx-artifacts-ap-southeast-2.s3.ap-southeast-2.amazonaws.com/cfn-provisioning-output.yml',
                organizationalUnitId: 'wl-development-main',
                parameters: {},
                runOrder: 1,
            },
            {
                name: 'cfn-device-monitor',
                description: 'stack set for cfn-device-monitor',
                resourceFile: 's3://somebucket/somezipfile.zip',
                organizationalUnitId: 'wl-development-main',
                parameters: {
                    environment: 'production',
                },
                runOrder: 2,
            },
        ];

        mockedComponentsDao.getComponentsByOu = jest.fn().mockResolvedValue(componentItems);
        mockedOrganizationalUnitsDao.getOrganizationalUnits = jest
            .fn()
            .mockResolvedValue([{ id: 'wl-development-main' }]);
        mockedManifestDao.getRegionAccountForOus = jest.fn().mockResolvedValue({
            'wl-development-main': {
                'ap-southeast-2': {
                    accounts: ['cdf-one'],
                },
                'ap-southeast-1': {
                    accounts: ['cdf-two'],
                },
                'us-west-1:us-west-2': {
                    accounts: ['cdf-three', 'cdf-four'],
                },
            },
        });
        instance = new ManifestService(
            mockedManifestDao,
            mockedComponentsDao,
            mockedOrganizationalUnitsDao,
            new ManifestAssembler('ap-southeast-2'),
            mockS3Factory,
            'bucket',
            'prefix',
            'fakeFilename'
        );
    });

    it('createManifestFile: happy path', async () => {
        let fileStream: NodeJS.ReadableStream;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        mockS3.upload = (
            params: S3.Types.PutObjectRequest,
            callback?: (err: Error, data: ManagedUpload.SendData) => void
        ): ManagedUpload => {
            fileStream = params.Body as NodeJS.ReadableStream;
            callback(null, { eTag: 'somefakeEtag' } as unknown as ManagedUpload.SendData);
            return undefined;
        };

        await instance.updateManifestFile();

        var manifestZipFile = '';
        fileStream.on('data', function (chunk) {
            manifestZipFile += chunk;
        });

        fileStream.on('end', async () => {
            const jsZip = new JSZip();
            const result = await jsZip.loadAsync(manifestZipFile);
            const manifestFile = await result.file('manifest.yaml').async('string');
            logger.info(manifestFile);
            expect(manifestFile).toEqual(expectedManifestFile);
        });
    });
});
