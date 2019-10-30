/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Before, setDefaultTimeout} from 'cucumber';
import { GroupsService, DevicesService, TemplatesService, CategoryEnum, TypeResource, Group10Resource } from '@cdf/assetlibrary-client/dist';

setDefaultTimeout(30 * 1000);

const DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID:string = 'test-devicehistory-device-type';
const DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID:string = 'test-devicehistory-group-type';
const DEVICEHISTORY_FEATURE_GROUP_PATH:string = '/test-devicehistory-group';
const DEVICEHISTORY_FEATURE_DEVICE_IDS:string[] = ['test-devicehistory-device001'];

let devices: DevicesService;
let groups: GroupsService;
let templates: TemplatesService;

Before(function () {
    devices = new DevicesService();
    groups = new GroupsService();
    templates = new TemplatesService();
});

async function deleteAssetLibraryTemplates(category:CategoryEnum, ids:string[]) {
    for(const id of ids) {
        await templates.deleteTemplate(category, id);
    }
}

async function deleteAssetLibraryDevices(ids:string[]) {
    for(const id of ids) {
        await devices.deleteDevice(id)
            .catch(_err=> {
                // ignore error in case it did not already exist
            });
    }
}

async function deleteAssetLibraryGroups(paths:string[]) {
    for(const path of paths) {
        await groups.deleteGroup(path)
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
    await templates.createTemplate(groupType);
    await templates.publishTemplate(CategoryEnum.group, DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID);

    // create group
    const group:Group10Resource = {
        templateId: DEVICEHISTORY_FEATURE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICEHISTORY_FEATURE_GROUP_PATH.substring(1),
        attributes: {}
    };
    await groups.createGroup(group);

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
    await templates.createTemplate(deviceType);
    await templates.publishTemplate(CategoryEnum.device, DEVICEHISTORY_FEATURE_DEVICE_TEMPLATE_ID);

});

Before({tags: '@teardown_deviceHistory_feature'}, async function () {
    await teardown_deviceHistory_feature();
});
