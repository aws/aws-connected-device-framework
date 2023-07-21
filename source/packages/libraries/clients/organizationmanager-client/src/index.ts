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
import { setLevel } from '@awssolutions/simple-cdf-logger';
setLevel('debug'); // TODO: investigate why this was overridden (maintaining previous code in utils/logger.ts)

export * from './client/accounts.model';
export * from './client/accounts.service';
export * from './client/bulkComponents.service';
export * from './client/components.model';
export * from './client/manifest.model';
export * from './client/organizationalUnits.model';
export * from './client/organizationalUnits.service';
export * from './client/pagination.model';
export * from './client/response.model';

export { organizationManagerContainerModule } from './di/inversify.config';
export { ORGMANLIBRARY_CLIENT_TYPES } from './di/types';
