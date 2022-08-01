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

import {Response} from 'express';
import {
    interfaces,
    controller,
    response,
    httpPost,
    requestBody,
    requestParam,
    httpGet,
    httpDelete,
    httpPatch,
    queryParam
} from 'inversify-express-utils';
import {inject} from 'inversify';
import {TYPES} from '../di/types';
import {logger} from '../utils/logger';
import {AccountsService} from './accounts.service';
import {
    AccountCreationRequest,
    AccountRegionUpdateRequest,
    AccountResource,
    AccountResourceList
} from './accounts.models';

import {handleError} from '../utils/errors';
import {ManifestService} from '../manifest/manifest.service';
import {AccountsAssembler} from './accounts.assembler';

@controller('')
export class AccountsController implements interfaces.Controller {

    constructor(@inject(TYPES.AccountsService) private accountsService: AccountsService,
                @inject(TYPES.ManifestService) private manifestService: ManifestService,
                @inject(TYPES.AccountsAssembler) private accountsAssembler: AccountsAssembler,) {
    }

    @httpPost('/organizationalUnits/:organizationalUnitId/accounts')
    public async createAccount(@requestParam('organizationalUnitId') organizationalUnitId: string, @requestBody() model: AccountCreationRequest, @response() res: Response): Promise<AccountResource> {
        logger.info(`accounts.controller  createAccount: in: model: ${JSON.stringify(model)}, organizationalUnitId: ${organizationalUnitId}`);
        try {
            const accountResource = await this.accountsService.createAccount(model);
            if (accountResource.status === 'ACTIVE') {
                await this.manifestService.updateManifestFile();
            }
            res.location(`/acccount/${model.accountId}`);
            res.status(202);
            return accountResource;

        } catch (e) {
            handleError(e, res);
        }
        return undefined
    }

    @httpGet('/organizationalUnits/:organizationalUnitId/accounts')
    public async getAccountsInOrganizationalUnit(@requestParam('organizationalUnitId') organizationalUnitId: string,
                                                 @queryParam('count') count: number,
                                                 @queryParam('exclusiveStartAccountName') exclusiveStartAccountName: string,
                                                 @response() res: Response): Promise<AccountResourceList> {
        logger.info(`organizations.controller getOrganizationalUnit: in: accountId: ${organizationalUnitId}`);
        try {
            const [items, paginationKey] = await this.accountsService.getAccountsInOu(organizationalUnitId, count,
                {organizationalUnitId, accountName: exclusiveStartAccountName})
            const resources = this.accountsAssembler.toListResource(items, count, paginationKey)
            logger.debug(`organizations.controller exit: ${JSON.stringify(resources)}`);
            return resources;
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpGet('/accounts/:accountId')
    public async getAccount(@requestParam('accountId') accountId: string, @response() res: Response): Promise<AccountResource> {
        logger.info(`accounts.controller getAccount: in: accountId: ${accountId}`);
        try {
            const model = await this.accountsService.getAccountById(accountId);
            logger.debug(`accounts.controller exit: ${JSON.stringify(model)}`);
            if (model === undefined) {
                res.status(404);
            } else {
                return model;
            }
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpPatch('/accounts/:id')
    public async updateAccount(@requestParam('id') accountId: string, @requestBody() requestBody: AccountRegionUpdateRequest, @response() res: Response): Promise<AccountResource> {
        logger.info(`accounts.controller updateAccount: in: accountName: ${accountId}`);
        try {
            await this.accountsService.updateAccountRegions({...requestBody, accountId});
            await this.manifestService.updateManifestFile();
            logger.debug(`accounts.controller exit:`);
            res.status(202);
        } catch (e) {
            handleError(e, res);
        }
        return null;
    }

    @httpDelete('/accounts/:accountId')
    public async deleteAccount(@requestParam('accountId') accountId: string,
                               @response() res: Response): Promise<void> {
        logger.info(`accounts.controller deleteAccount: in: accountId:${accountId}`);
        try {
            await this.accountsService.deleteAccount(accountId)
            res.status(204)
        } catch (err) {
            handleError(err, res);
        }
        logger.info(`accounts.controller deleteAccount: exit:`);
    }
}
