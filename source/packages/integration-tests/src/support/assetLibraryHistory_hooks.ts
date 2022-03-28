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
import { Before, setDefaultTimeout} from '@cucumber/cucumber';
import {
    GroupsService,
    DevicesService,
    TemplatesService,
    CategoryEnum,
    TypeResource,
    Group10Resource,
    ASSETLIBRARY_CLIENT_TYPES,
} from '@cdf/assetlibrary-client/dist';
import {container} from '../di/inversify.config';
import {sign} from 'jsonwebtoken';
import {Dictionary} from '../../../libraries/core/lambda-invoke/src';

setDefaultTimeout(30 * 1000);

const DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID = 'test-devicehistory-device-type';
const DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID = 'test-devicehistory-group-type';
const DEVICEHISTORY_FEATURE_GROUP_PATH = '/test-devicehistory-group';
const DEVICEHISTORY_FEATURE_DEVICE_IDS = ['test-devicehistory-device001'];

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const devicesService:DevicesService = container.get(ASSETLIBRARY_CLIENT_TYPES.DevicesService);
const groupsService:GroupsService = container.get(ASSETLIBRARY_CLIENT_TYPES.GroupsService);
const templatesService:TemplatesService = container.get(ASSETLIBRARY_CLIENT_TYPES.TemplatesService);

const adminClaims:{[key:string]: string[]}= {
    cdf_al: ['/:*']
};
const authToken = sign(adminClaims, 'shared-secret');
const additionalHeaders: Dictionary = {
    Authorization: authToken
};

async function deleteAssetLibraryTemplates(category:CategoryEnum, ids:string[]) {
    for(const id of ids) {
        await templatesService.deleteTemplate(category, id, additionalHeaders);
    }
}

async function deleteAssetLibraryDevices(ids:string[]) {
    for(const id of ids) {
        await devicesService.deleteDevice(id, additionalHeaders)
            .catch(_err=> {
                // ignore error in case it did not already exist
            });
    }
}

async function deleteAssetLibraryGroups(paths:string[]) {
    for(const path of paths) {
        await groupsService.deleteGroup(path, additionalHeaders)
            .catch(_err=> {
                // ignore error in case it did not already exist
            });
    }
}

async function teardown_deviceHistory_feature() {
    await deleteAssetLibraryDevices(DEVICEHISTORY_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups([DEVICEHISTORY_FEATURE_GROUP_PATH]);
    await deleteAssetLibraryTemplates(CategoryEnum.device, [DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID]);
    await deleteAssetLibraryTemplates(CategoryEnum.group, [DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID]);
}

Before({tags: '@setup_deviceHistory_feature'}, async function () {
    await teardown_deviceHistory_feature();

    // create group template
    const groupType:TypeResource = {
        templateId: DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID,
        category: 'group'
    };
    await templatesService.createTemplate(groupType, additionalHeaders);
    await templatesService.publishTemplate(CategoryEnum.group, DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID, additionalHeaders);

    // create group
    const group:Group10Resource = {
        templateId: DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICEHISTORY_FEATURE_GROUP_PATH.substring(1),
        attributes: {}
    };
    await groupsService.createGroup(group, undefined, additionalHeaders);

    // create device type
    const deviceType:TypeResource = {
        templateId: DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID,
        category: 'device',
        properties: {
            firmwareVersion: { type: 'string'}
        },
        relations: {
            out: {
                linked_to: [DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID]
            }
        }
    };
    await templatesService.createTemplate(deviceType, additionalHeaders);
    await templatesService.publishTemplate(CategoryEnum.device, DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID, additionalHeaders);

});

Before({tags: '@teardown_deviceHistory_feature'}, async function () {
    await teardown_deviceHistory_feature();
});
