/*********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
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
import '@awssolutions/cdf-config-inject';
import { Container, decorate, injectable, interfaces } from 'inversify';
import { TYPES } from './types';
import { HttpHeaderUtils } from '../utils/httpHeaders';
import AWS = require('aws-sdk');

// Note: importing @controller's carries out a one time inversify metadata generation...
import '../accounts/accounts.controller';
import '../organizationalUnits/organizationalUnits.controller';
import '../components/bulkcomponents.controller';

import { AccountsDao } from '../accounts/accounts.dao';
import { AccountsService } from '../accounts/accounts.service';
import { OrganizationalUnitsService } from '../organizationalUnits/organizationalUnits.service';
import { AccountsAssembler } from '../accounts/accounts.assembler';
import { OrganizationalUnitsDao } from '../organizationalUnits/organizationalUnits.dao';
import { ManifestService } from '../manifest/manifest.service';
import { ManifestDao } from '../manifest/manifest.dao';
import { ManifestAssembler } from '../manifest/manifest.assembler';
import { ComponentsDao } from '../components/components.dao';
import { ComponentsService } from '../components/components.service';
import { OrganizationalUnitsAssembler } from '../organizationalUnits/organizationalUnits.assembler';

// Load everything needed to the Container
export const container = new Container();

container.bind<string>('tmpdir').toConstantValue(process.env.TMPDIR);
container.bind<string>('aws.region').toConstantValue(process.env.AWS_REGION);
container
    .bind<string>('aws.dynamodb.tables.accounts')
    .toConstantValue(process.env.AWS_DYNAMODB_ORGANIZATION_TABLE);
container
    .bind<string>('aws.dynamodb.tables.gsi1')
    .toConstantValue(process.env.AWS_DYNAMODB_TABLES_ORGANIZATION_GSI1);
container
    .bind<string>('aws.dynamodb.tables.gsi2')
    .toConstantValue(process.env.AWS_DYNAMODB_TABLES_ORGANIZATION_GSI2);
container.bind<string>('aws.iam.role').toConstantValue(process.env.MANAGEMENT_ACCOUNT_ASSUME_ROLE);
container
    .bind<string>('aws.s3.controltower.bucket')
    .toConstantValue(process.env.CONTROL_TOWER_MANIFEST_BUCKET);
container
    .bind<string>('aws.s3.controltower.prefix')
    .toConstantValue(process.env.CONTROL_TOWER_MANIFEST_PREFIX);
container
    .bind<string>('aws.s3.controltower.filename')
    .toConstantValue(process.env.CONTROL_TOWER_MANIFEST_FILENAME);
container
    .bind<boolean>('featureToggle.ous.create')
    .toConstantValue(process.env.ENABLE_CREATE_OUS_FEATURE == 'true');
container
    .bind<boolean>('featureToggle.ous.delete')
    .toConstantValue(process.env.ENABLE_DELETE_OUS_FEATURE == 'true');
container
    .bind<boolean>('featureToggle.accounts.create')
    .toConstantValue(process.env.ENABLE_CREATE_ACCOUNTS_FEATURE == 'true');
container
    .bind<boolean>('featureToggle.accounts.delete')
    .toConstantValue(process.env.ENABLE_DELETE_ACCOUNTS_FEATURE == 'true');
container.bind<string>('aws.organizations.suspendedOU').toConstantValue(process.env.SUSPENDED_OU);
container
    .bind<string>('aws.servicecatalog.product.owner')
    .toConstantValue(process.env.SERVICE_CATALOG_PRODUCT_OWNER);
container
    .bind<string>('aws.servicecatalog.product.name')
    .toConstantValue(process.env.SERVICE_CATALOG_PRODUCT_NAME);

container.bind<HttpHeaderUtils>(TYPES.HttpHeaderUtils).to(HttpHeaderUtils);
container.bind<ComponentsDao>(TYPES.ComponentsDao).to(ComponentsDao);
container.bind<ComponentsService>(TYPES.ComponentsService).to(ComponentsService);
container.bind<AccountsDao>(TYPES.AccountsDao).to(AccountsDao);
container.bind<AccountsService>(TYPES.AccountsService).to(AccountsService);
container.bind<AccountsAssembler>(TYPES.AccountsAssembler).to(AccountsAssembler);
container.bind<ManifestService>(TYPES.ManifestService).to(ManifestService);
container.bind<ManifestDao>(TYPES.ManifestDao).to(ManifestDao);
container.bind<ManifestAssembler>(TYPES.ManifestAssembler).to(ManifestAssembler);

container
    .bind<OrganizationalUnitsService>(TYPES.OrganizationalUnitsService)
    .to(OrganizationalUnitsService);
container.bind<OrganizationalUnitsDao>(TYPES.OrganizationalUnitsDao).to(OrganizationalUnitsDao);
container
    .bind<OrganizationalUnitsAssembler>(TYPES.OrganizationalUnitsAssembler)
    .to(OrganizationalUnitsAssembler);

const managementAccountCredentials = new AWS.ChainableTemporaryCredentials({
    params: {
        RoleArn: process.env.MANAGEMENT_ACCOUNT_ASSUME_ROLE,
        RoleSessionName: `cdf-organization-assume-management`,
    },
});

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.DynamoDB.DocumentClient);
container
    .bind<interfaces.Factory<AWS.DynamoDB.DocumentClient>>(TYPES.DocumentClientFactory)
    .toFactory<AWS.DynamoDB.DocumentClient>(() => {
        return () => {
            if (!container.isBound(TYPES.DocumentClient)) {
                const dc = new AWS.DynamoDB.DocumentClient({ region: process.env.AWS_REGION });
                container
                    .bind<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient)
                    .toConstantValue(dc);
            }
            return container.get<AWS.DynamoDB.DocumentClient>(TYPES.DocumentClient);
        };
    });

// for 3rd party objects, we need to use factory injectors
decorate(injectable(), AWS.ServiceCatalog);
container
    .bind<interfaces.Factory<AWS.ServiceCatalog>>(TYPES.ServiceCatalogFactory)
    .toFactory<AWS.ServiceCatalog>(() => {
        return () => {
            if (!container.isBound(TYPES.ServiceCatalog)) {
                const dc = new AWS.ServiceCatalog({
                    credentials: managementAccountCredentials,
                    region: process.env.AWS_REGION,
                });
                container.bind<AWS.ServiceCatalog>(TYPES.ServiceCatalog).toConstantValue(dc);
            }
            return container.get<AWS.ServiceCatalog>(TYPES.ServiceCatalog);
        };
    });

// Organizations
decorate(injectable(), AWS.Organizations);
container
    .bind<interfaces.Factory<AWS.Organizations>>(TYPES.OrganizationsFactory)
    .toFactory<AWS.Organizations>(() => {
        return () => {
            const awsOrganizationsRegion = 'us-east-1';
            if (!container.isBound(TYPES.Organizations)) {
                const organizations = new AWS.Organizations({
                    region: awsOrganizationsRegion,
                    credentials: managementAccountCredentials,
                });
                container
                    .bind<AWS.Organizations>(TYPES.Organizations)
                    .toConstantValue(organizations);
            }
            return container.get<AWS.Organizations>(TYPES.Organizations);
        };
    });

// StepFunctions
decorate(injectable(), AWS.StepFunctions);
container
    .bind<interfaces.Factory<AWS.StepFunctions>>(TYPES.StepFunctions)
    .toFactory<AWS.StepFunctions>(() => {
        return () => {
            if (!container.isBound(TYPES.StepFunctions)) {
                const StepFunctions = new AWS.StepFunctions({ region: process.env.AWS_REGION });
                container
                    .bind<AWS.StepFunctions>(TYPES.StepFunctions)
                    .toConstantValue(StepFunctions);
            }
            return container.get<AWS.StepFunctions>(TYPES.StepFunctions);
        };
    });

// S3
decorate(injectable(), AWS.S3);
container.bind<interfaces.Factory<AWS.S3>>(TYPES.S3Factory).toFactory<AWS.S3>(() => {
    return () => {
        if (!container.isBound(TYPES.S3)) {
            const s3 = new AWS.S3({ region: process.env.AWS_REGION });
            container.bind<AWS.S3>(TYPES.S3).toConstantValue(s3);
        }
        return container.get<AWS.S3>(TYPES.S3);
    };
});
