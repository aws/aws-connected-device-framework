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
export const TYPES = {
    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    ComponentsService: Symbol.for('ComponentsService'),
    ComponentsDao: Symbol.for('ComponentsDao'),

    AccountsService: Symbol.for('AccountsService'),
    AccountsDao: Symbol.for('AccountsDao'),
    AccountsAssembler: Symbol.for('AccountsAssembler'),

    ManifestDao: Symbol.for('ManifestDao'),
    ManifestService: Symbol.for('ManifestService'),
    ManifestAssembler: Symbol.for('ManifestAssembler'),

    OrganizationalUnitsService: Symbol.for('OrganizationalUnitsService'),
    OrganizationalUnitsDao: Symbol.for('OrganizationalUnitsDao'),
    OrganizationalUnitsAssembler: Symbol.for('OrganizationalUnitsAssembler'),

    Organizations: Symbol.for('Organizations'),
    OrganizationsFactory: Symbol.for('Factory<Organizations>'),

    StepFunctions: Symbol.for('StepFunctions'),
    StepFunctionsFactory: Symbol.for('Factory<StepFunctions>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    ServiceCatalog: Symbol.for('ServiceCatalog'),
    ServiceCatalogFactory: Symbol.for('Factory<ServiceCatalog>'),
};
