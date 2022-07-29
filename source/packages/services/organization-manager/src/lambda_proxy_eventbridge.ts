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
import 'reflect-metadata';
import { container } from './di/inversify.config';
import { Context, EventBridgeEvent } from 'aws-lambda';
import { logger } from './utils/logger';
import { TYPES } from './di/types';
import { ManifestService } from './manifest/manifest.service';
import { AccountsService } from './accounts/accounts.service';
import {
  AccountComponentModel as AccountComponentResource,
  AccountStatus,
  AccountUpdateRequest,
  ComponentStatus,
} from './accounts/accounts.models';
import { ComponentsService } from './components/components.service';

let manifestService: ManifestService;
let accountService: AccountsService;
let componentsService: ComponentsService;

export interface OrganizationalUnit {
  organizationalUnitName: string;
  organizationalUnitId: string;
}

export interface Account {
  accountName: string;
  accountId: string;
}
export interface ManagedAccountStatus {
  organizationalUnit: OrganizationalUnit;
  account: Account;
  state: string;
  message: string;
  requestedTimestamp: Date;
  completedTimestamp: Date;
}

export interface ControlTowerEventDetails {
  createManagedAccountStatus?: ManagedAccountStatus;
  updateManagedAccountStatus?: ManagedAccountStatus;
}
export interface StackUpdateEventDetail {
  region: string;
  accountId: string;
  componentName: string;
  status: ComponentStatus;
}

const toAccountComponentResource = (
  stackEventDetail: StackUpdateEventDetail
): AccountComponentResource => {
  const { accountId, region, status, componentName } = stackEventDetail;
  return {
    region,
    accountId,
    status,
    componentName,
  };
};

const toUpdateAccountCreatedRequest = (
  managedAccountStatus: ManagedAccountStatus
): AccountUpdateRequest => {
  let status: AccountStatus, accountId: string;
  const accountName = managedAccountStatus?.account?.accountName;
  if (managedAccountStatus?.state === 'SUCCEEDED') {
    status = 'ACTIVE';
  } else {
    status = 'ERROR';
  }
  if (managedAccountStatus?.account?.accountId) {
    accountId = managedAccountStatus?.account?.accountId;
  }
  return {
    name: accountName,
    organizationalUnitId: managedAccountStatus.organizationalUnit.organizationalUnitId,
    accountId,
    status,
  };
};

export const handler = async (
  event: EventBridgeEvent<any, any>,
  _context: Context
): Promise<void> => {
  logger.debug(`handler: event: ${JSON.stringify(event)}`);

  if (manifestService === undefined) {
    manifestService = container.get(TYPES.ManifestService);
  }

  if (accountService === undefined) {
    accountService = container.get(TYPES.AccountsService);
  }

  if (componentsService === undefined) {
    componentsService = container.get(TYPES.ComponentsService);
  }

  try {
    let request: AccountUpdateRequest;
    switch (event.source) {
      case 'aws.controltower':
        if (event.detail.eventName === 'CreateManagedAccount') {
          request = toUpdateAccountCreatedRequest(
            event?.detail?.serviceEventDetails?.serviceEventDetails?.createManagedAccountStatus
          );
        } else if (event.detail.eventName === 'UpdateManagedAccount') {
          request = toUpdateAccountCreatedRequest(
            event?.detail?.serviceEventDetails?.serviceEventDetails?.updateManagedAccountStatus
          );
        }

        await accountService.updateAccountStatus(request);

        if (request?.status === 'ACTIVE') {
          logger.debug('handler: updating manifest file');
          await manifestService.updateManifestFile();
        }

        break;

      case 'com.aws.cdf.customresource':
        if (
          event.detail.eventName == 'CDFStackUpdated' ||
          event.detail.eventName == 'CDFStackCreated'
        ) {
          const accountResource = await accountService.getAccountById(event.detail?.accountId);
          const { organizationalUnitId: organizationalUnit } = accountResource;

          const components = await componentsService.listComponents(organizationalUnit);

          const component = components.find((o) => event.detail?.stackName.includes(o.name));
          if (!component) {
            logger.error(
              `handler: could not derive component name from stackName : ${event.detail?.stackName}`
            );
            return;
          }

          const updateComponentRequest = toAccountComponentResource({
            ...event.detail,
            componentName: component.name,
          });

          await accountService.updateComponentByAccount(updateComponentRequest);

          const areAllComponentsDeployed = await accountService.areAllComponentsDeployed(
            event.detail?.accountId,
            components
          );

          if (areAllComponentsDeployed) {
            const { name, organizationalUnitId, accountId } = accountResource;
            await accountService.updateAccountStatus({
              name,
              organizationalUnitId,
              accountId,
              status: 'PROVISIONED',
            });
          }
        }
        break;
    }
  } catch (Exception) {
    logger.error(Exception);
  }
  logger.debug('handler: exit:');
};
