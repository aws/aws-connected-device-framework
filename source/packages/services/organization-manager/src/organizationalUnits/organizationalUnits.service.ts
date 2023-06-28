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

import {inject, injectable} from 'inversify';
import {TYPES} from "../di/types";
import {logger} from "../utils/logger";
import { owCheckUnprintableChar, owCheckOversizeString } from '../utils/inputValidation.util';
import ow from "ow";
import {OrganizationalUnitResource} from "./organizationalUnits.model";
import {Tag, Tags} from "aws-sdk/clients/organizations";
import {OrganizationalUnitsDao} from "./organizationalUnits.dao";
import {OrganizationalUnitsAssembler} from './organizationalUnits.assembler';
import {AccountsDao} from '../accounts/accounts.dao';

const convertAWSTagsToCDFTags = (tagResult: { [key: string]: string }, currentTag: Tag) => {
    tagResult[currentTag.Key] = currentTag.Value
    return tagResult
};

@injectable()
export class OrganizationalUnitsService {

    private _organizations: AWS.Organizations;

    constructor(
        @inject('featureToggle.ous.create') private createOuInOrganizations: boolean,
        @inject('featureToggle.ous.delete') private deleteOuInOrganizations: boolean,
        @inject(TYPES.OrganizationalUnitsDao) private organizationalUnitsDao: OrganizationalUnitsDao,
        @inject(TYPES.OrganizationalUnitsAssembler) private organizationalUnitsAssembler: OrganizationalUnitsAssembler,
        @inject(TYPES.AccountsDao) private accountsDao: AccountsDao,
        @inject(TYPES.OrganizationsFactory) organizationsFactory: () => AWS.Organizations,
    ) {
        this._organizations = organizationsFactory();
    }

    private async getRootId(): Promise<string> {
        const listRootsResponse = await this._organizations.listRoots().promise()
        return listRootsResponse?.Roots[0]?.Id;
    }

    private async createOrganizationalUnitInMaster(ouName: string, tags: { [key: string]: string }): Promise<string> {
        const rootId = await this.getRootId();

        if (rootId === undefined) {
            throw new Error('root cannot be found in current organizations')
        }

        const createTagsRequest: Tags = []

        for (const [key, value] of Object.entries(tags)) {
            createTagsRequest.push({
                Key: key,
                Value: value
            })
        }

        const createOrganizationalUnitResponse = await this._organizations.createOrganizationalUnit(
            {
                ParentId: rootId,
                Name: ouName,
                Tags: createTagsRequest
            }
        ).promise();

        return createOrganizationalUnitResponse?.OrganizationalUnit?.Id
    }

    public async createOrganizationalUnit(request: OrganizationalUnitResource): Promise<string> {
        logger.debug(`organizationmanager.service createOrganizationalUnit: in: request: ${JSON.stringify(request)}`);

        ow(request, ow.object.nonEmpty)
        ow(request.name, ow.string.nonEmpty)
        owCheckUnprintableChar(request.name, 'request.name');
        owCheckOversizeString(request.name, 2048, 'request.name');
        ow(request.tags, ow.object.nonEmpty)

        request.createdAt = new Date()
        const {name, tags} = request

        if (this.createOuInOrganizations) {
            logger.debug(`organizationmanager.service createOrganizationalUnit: creating new ou`)
            request.id = await this.createOrganizationalUnitInMaster(name, tags)
        } else {
            ow(request.id, ow.string.nonEmpty)
            owCheckUnprintableChar(request.id, 'request.id');
            owCheckOversizeString(request.id, 2048, 'request.id');
            logger.debug(`organizationmanager.service createOrganizationalUnit: registering existing ou:${request.id}`)
        }
        await this.organizationalUnitsDao.createOrganizationalUnit(this.organizationalUnitsAssembler.toItem(request))
        logger.debug(`organizationmanager.service: createOrganizationalUnit: out: ${JSON.stringify(request)}`);
        return request.id;
    }

    public async listOrganizationalUnits(): Promise<OrganizationalUnitResource[] | undefined> {
        logger.debug(`organizationmanager.service listOrganizationalUnits:`);

        if (!this.createOuInOrganizations) {
            const organizationalUnitItems = await this.organizationalUnitsDao.getOrganizationalUnits()
            const organizationalUnitResourceList = this.organizationalUnitsAssembler.toResourceList(organizationalUnitItems)
            return organizationalUnitResourceList
        }

        const rootId = await this.getRootId();

        const listOrganizationalUnitsForParentResponse = await this._organizations.listOrganizationalUnitsForParent({
            ParentId: rootId,
        }).promise();

        const organizationalUnits: OrganizationalUnitResource[] = [];

        for (const ou of listOrganizationalUnitsForParentResponse?.OrganizationalUnits) {

            const listTagsForResourceResponse = await this._organizations.listTagsForResource({ResourceId: ou.Id}).promise();

            const tags = listTagsForResourceResponse?.Tags?.reduce(convertAWSTagsToCDFTags, {})

            organizationalUnits.push({
                name: ou.Name,
                id: ou.Id,
                tags
            })
        }

        logger.debug(`organizationmanager.service: listOrganizationalUnits: out: ${JSON.stringify(organizationalUnits)}`);
        return organizationalUnits
    }

    public async deleteOrganizationalUnit(id: string): Promise<void> {

        logger.debug(`organizationmanager.service deletOrganizationalUnit: in: id: ${id}`);

        const [accounts, _] = await this.accountsDao.getAccountsInOu(id);

        if (accounts.length > 0) {
            throw new Error(`FAILED_VALIDATION`)
        }

        if (this.deleteOuInOrganizations) {
            await this._organizations.deleteOrganizationalUnit({
                OrganizationalUnitId: id
            }).promise()
        }

        await this.organizationalUnitsDao.deleteOrganizationalUnit(id)

        logger.debug(`organizationmanager.service: deletOrganizationalUnit: out:`);
    }

    public async getOrganizationalUnit(id: string): Promise<OrganizationalUnitResource> {

        logger.debug(`organizationmanager.service getOrganizationalUnit: in: id: ${id}`);

        ow(id, ow.string.nonEmpty)

        const organizationalUnitItem = await this.organizationalUnitsDao.getOrganizationalUnit(id);

        if (organizationalUnitItem === undefined) {
            return undefined
        }

        const organizationalUnitResource = this.organizationalUnitsAssembler.toResource(organizationalUnitItem)

        let tags;

        if (this.createOuInOrganizations) {
            const listTagsForResourceResponse = await this._organizations.listTagsForResource({ResourceId: organizationalUnitItem.id}).promise();
            tags = listTagsForResourceResponse?.Tags?.reduce(convertAWSTagsToCDFTags, {})
            organizationalUnitResource.tags = tags;
        }

        logger.debug(`organizationmanager.service: getOrganizationalUnit: out: ${JSON.stringify(organizationalUnitResource)}`);

        return organizationalUnitResource;
    }
}
