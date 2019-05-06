/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Before, setDefaultTimeout} from 'cucumber';
import { GroupsService, DevicesService, TemplatesService, CategoryEnum, TypeResource, Device, Group, ProfilesService } from '@cdf/assetlibrary-client/dist';

setDefaultTimeout(30 * 1000);

const DEVICES_FEATURE_DEVICE_IDS:string[] = ['TEST-devices-device001','TEST-devices-device002','TEST-devices-device003','TEST-devices-device004'];
const DEVICES_FEATURE_LINKABLE_GROUP_PATH:string = '/TEST-devices-linkableGroup001';
const DEVICES_FEATURE_UNLINKABLE_GROUP_PATH:string = '/TEST-devices-unlinkableGroup001';
const DEVICES_FEATURE_UNPROVISIONED_GROUP_PATH:string = '/unprovisioned';
const DEVICES_FEATURE_GROUP_PATHS:string[] = [DEVICES_FEATURE_LINKABLE_GROUP_PATH, DEVICES_FEATURE_UNLINKABLE_GROUP_PATH, '/unprovisioned'];
const DEVICES_FEATURE_DEVICE_TEMPLATE_IDS:string[] = ['TEST-devices-type'];
const DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID:string = 'TEST-devices-linkableGroup';
const DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID:string = 'TEST-devices-unlinkableGroup';
const DEVICES_FEATURE_GROUP_TEMPLATE_IDS:string[] = [DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID];

const DEVICES_FEATURE_LITE_DEVICE_IDS:string[] = ['TEST-devices-device001','TEST-devices-device002'];
const DEVICES_FEATURE_LITE_GROUP_PATH:string = 'TEST-devices-group001';
const DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH:string = 'unprovisioned';
const DEVICES_FEATURE_LITE_GROUP_PATHS:string[] = [DEVICES_FEATURE_LITE_GROUP_PATH, DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH];
const DEVICES_FEATURE_LITE_DEVICE_TEMPLATE_IDS:string[] = ['TEST-devices-type'];

const DEVICEPROFILES_FEATURE_DEVICE_IDS:string[] = ['TEST-deviceProfiles-device001','TEST-deviceProfiles-device002','TEST-deviceProfiles-device003','TEST-deviceProfiles-device004'];
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH:string = '/TEST-deviceProfiles-linkableGroup001';
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH:string = '/TEST-deviceProfiles-linkableGroup002';
const DEVICEPROFILES_FEATURE_GROUP_PATHS:string[] = [DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH, DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH];
const DEVICEPROFILES_FEATURE_DEVICE_TEMPLATE_IDS:string[] = ['TEST-deviceProfiles-type'];
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID:string = 'TEST-deviceProfiles-linkableGroup';
const DEVICEPROFILES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID:string = 'TEST-deviceProfiles-unlinkableGroup';
const DEVICEPROFILES_FEATURE_GROUP_TEMPLATE_IDS:string[] = [DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,DEVICEPROFILES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID];
const DEVICEPROFILES_FEATURE_DEVICE_PROFILE_IDS:string[] = ['TEST-deviceProfiles-type___TEST-deviceProfiles-profile', 'TEST-deviceProfiles-type___TEST-deviceProfiles-profile-invalid'];

const GROUPPROFILES_FEATURE_GROUP_PATHS:string[] = ['/test-groupprofiles-group001','/test-groupprofiles-group002','/test-groupprofiles-group003','/test-groupprofiles-group004','/test-groupprofiles-group005'];
const GROUPPROFILES_FEATURE_GROUP_TEMPLATE_IDS:string[] = ['TEST-groupProfiles-type'];
const GROUPPROFILES_FEATURE_GROUP_PROFILE_IDS:string[] = ['TEST-groupProfiles-type___TEST-groupProfiles-profile', 'TEST-groupProfiles-type___TEST-groupProfiles-profile-invalid'];

const GROUPS_FEATURES_GROUP_PATHS:string[] = ['/TEST-groups-group001','/TEST-groups-group002','/TEST-groups-group003','/TEST-groups-group004'];
const GROUP_FEATURES_GROUP_TEMPLATE_IDS:string[] = ['TEST-groups-groupTemplate001','TEST-groups-groupTemplate002'];

const GROUPS_LITE_FEATURES_GROUP_PATHS:string[] = ['TEST-groups-group001'];

const GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS:string[] = ['TEST-groupMembers-group'];
const GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A = 'TEST-groupMembers-deviceLinkableToGroupA';
const GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B = 'TEST-groupMembers-deviceLinkableToGroupB';
const GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID = 'TEST-groupMembers-deviceNotLinkableToGroup';
const GROUPMEMBERS_FEATURE_DEVICE_TEMPLATE_IDS:string[] = [GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A, GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B, GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID];
const GROUPMEMBERS_FEATURE_GROUP_PATHS:string[] = ['/test-groupmembers-parent/child1','/test-groupmembers-parent/child2','/test-groupmembers-parent'];
const GROUPMEMBERS_FEATURE_DEVICE_IDS:string[] = ['TEST-groupMembers-device001','TEST-groupMembers-device002','TEST-groupMembers-device003'];

const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A = 'TEST-groupMembers-deviceTypeA-012';
const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B = 'TEST-groupMembers-deviceTypeB-012';
const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_IDS:string[] = [GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A,GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B];
const GROUPMEMBERS_LITE_FEATURE_GROUP_PATHS:string[] = ['child1','child2','TEST-groupMembers-parent'];

const DEVICESEARCH_FEATURES_DEVICE_ID_1A = 'TEST-deviceSearch-001A';
const DEVICESEARCH_FEATURES_DEVICE_ID_1B = 'TEST-deviceSearch-001B';
const DEVICESEARCH_FEATURES_DEVICE_ID_2A = 'TEST-deviceSearch-002A';
const DEVICESEARCH_FEATURES_DEVICE_ID_2B = 'TEST-deviceSearch-002B';
const DEVICESEARCH_FEATURES_DEVICE_IDS = [DEVICESEARCH_FEATURES_DEVICE_ID_1A,DEVICESEARCH_FEATURES_DEVICE_ID_1B,DEVICESEARCH_FEATURES_DEVICE_ID_2A,DEVICESEARCH_FEATURES_DEVICE_ID_2B];
const DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS = ['TEST-deviceSearch-device-004'];
const DEVICESEARCH_FEATURES_GROUPS_PATHS = ['/deviceSearch_feature'];

const DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS = ['deviceSearch_feature'];

const GROUPSEARCH_FEATURES_GROUP_PATH_ROOT = '/groupSearch_feature';
const GROUPSEARCH_FEATURES_GROUP_PATH_AA = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/AA`;
const GROUPSEARCH_FEATURES_GROUP_PATH_AB = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/AB`;
const GROUPSEARCH_FEATURES_GROUP_PATH_BA = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/BA`;
const GROUPSEARCH_FEATURES_GROUP_PATH_BB = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/BB`;
const GROUPSEARCH_FEATURES_GROUPS_PATHS = [GROUPSEARCH_FEATURES_GROUP_PATH_AA,GROUPSEARCH_FEATURES_GROUP_PATH_AB,GROUPSEARCH_FEATURES_GROUP_PATH_BA,GROUPSEARCH_FEATURES_GROUP_PATH_BB,GROUPSEARCH_FEATURES_GROUP_PATH_ROOT];
const GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS = ['TEST-groupSearch-group'];

const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT = 'groupSearch_feature';
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA = `AA`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB = `AB`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA = `BA`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB = `BB`;
const GROUPSEARCH_LITE_FEATURES_GROUPS_PATHS = [GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA,GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB,GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA,GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB,GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT];

let devices: DevicesService;
let groups: GroupsService;
let templates: TemplatesService;
let profiles: ProfilesService;

Before(function () {
    devices = new DevicesService();
    groups = new GroupsService();
    templates = new TemplatesService();
    profiles = new ProfilesService();
});

async function deleteAssetLibraryTemplates(category:CategoryEnum, ids:string[]) {
    for(const id of ids) {
        await templates.deleteTemplate(category, id)
        .catch(_err=> {
            // ignore error in case it did not already exist
        });

        // NOTE: deleted templates don't need publishing
        // await templates.publishTemplate(category, id)
        //     .catch(_err=> {
        //         // ignore error in case it did not already exist
        //     });
    }
}

async function deleteAssetLibraryDeviceProfiles(ids:string[]) {
    for(const id of ids) {
        const ids_split=id.split('___');
        await profiles.deleteDeviceProfile(ids_split[0], ids_split[1])
            .catch(_err=> {
                // ignore error in case it did not already exist
            });
    }
}

async function deleteAssetLibraryGroupProfiles(ids:string[]) {
    for(const id of ids) {
        const ids_split=id.split('___');
        await profiles.deleteGroupProfile(ids_split[0], ids_split[1])
            .catch(_err=> {
                // ignore error in case it did not already exist
            });
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

async function teardown_devices_feature() {
    await deleteAssetLibraryDevices(DEVICES_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICES_FEATURE_DEVICE_TEMPLATE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, DEVICES_FEATURE_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_devices_feature'}, async function () {
    await teardown_devices_feature();

    // create linkable group template
    const linkableGroupType:TypeResource = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        category: 'group'
    };
    await templates.createTemplate(linkableGroupType);
    await templates.publishTemplate(CategoryEnum.group, DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID);

    // create linkable group
    const linkableGroup:Group = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICES_FEATURE_LINKABLE_GROUP_PATH.substring(1),
        attributes: {}
    };
    await groups.createGroup(linkableGroup);

    // create unprovisioned group
    const unprovosionedGroup:Group = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICES_FEATURE_UNPROVISIONED_GROUP_PATH.substring(1),
        attributes: {}
    };
    await groups.createGroup(unprovosionedGroup);

    // create unlinkable group template
    const unlinkableGroupType:TypeResource = {
        templateId: DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        category: 'group'
    };
    await templates.createTemplate(unlinkableGroupType);
    await templates.publishTemplate(CategoryEnum.group, DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID);

    // create unlinkable group template
    const unlinkableGroup:Group = {
        templateId: DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICES_FEATURE_UNLINKABLE_GROUP_PATH.substring(1),
        attributes: {}
    };
    await groups.createGroup(unlinkableGroup);
});

Before({tags: '@teardown_devices_feature'}, async function () {
    await teardown_devices_feature();
});

async function teardown_devices_feature_lite() {

    await deleteAssetLibraryDevices(DEVICES_FEATURE_LITE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICES_FEATURE_LITE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICES_FEATURE_LITE_DEVICE_TEMPLATE_IDS);
}

Before({tags: '@setup_devices_feature_lite'}, async function () {
    await teardown_devices_feature_lite();

    // create  group
    const group:Group = {
        name: DEVICES_FEATURE_LITE_GROUP_PATH,
        attributes: {}
    };
    await groups.createGroup(group);

    // create unprovisioned group
    const unprovisionedGroup:Group = {
        name: DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH,
        attributes: {}
    };
    await groups.createGroup(unprovisionedGroup);

});

Before({tags: '@teardown_devices_feature_lite'}, async function () {
    await teardown_devices_feature_lite();
});

async function teardown_deviceProfiles_feature() {
    await deleteAssetLibraryDeviceProfiles(DEVICEPROFILES_FEATURE_DEVICE_PROFILE_IDS);
    await deleteAssetLibraryDevices(DEVICEPROFILES_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICEPROFILES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICEPROFILES_FEATURE_DEVICE_TEMPLATE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, DEVICEPROFILES_FEATURE_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_deviceProfiles_feature'}, async function () {
    await teardown_deviceProfiles_feature();

    // create linkable group template
    const linkableGroupType:TypeResource = {
        templateId: DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        category: 'group'
    };
    await templates.createTemplate(linkableGroupType);
    await templates.publishTemplate(CategoryEnum.group, DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID);

    // create linkable group 1
    const linkableGroup:Group = {
        templateId: DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH.substring(1),
        attributes: {}
    };
    await groups.createGroup(linkableGroup);

    // create linkable group 2
    linkableGroup.name = DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH.substring(1);
    await groups.createGroup(linkableGroup);

});

Before({tags: '@teardown_deviceProfiles_feature'}, async function () {
    await teardown_deviceProfiles_feature();
});

async function teardown_groupProfiles_feature() {
    await deleteAssetLibraryGroupProfiles(GROUPPROFILES_FEATURE_GROUP_PROFILE_IDS);
    await deleteAssetLibraryGroups(GROUPPROFILES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUPPROFILES_FEATURE_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_groupProfiles_feature'}, async function () {
    await teardown_groupProfiles_feature();
});

Before({tags: '@teardown_groupProfiles_feature'}, async function () {
    await teardown_groupProfiles_feature();
});

async function teardown_groups_feature() {
    await deleteAssetLibraryGroups(GROUPS_FEATURES_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUP_FEATURES_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_groups_feature'}, async function () {
    await teardown_groups_feature();
});

Before({tags: '@teardown_groups_feature'}, async function () {
    await teardown_groups_feature();
});

async function teardown_groups_lite_feature() {
    await deleteAssetLibraryGroups(GROUPS_LITE_FEATURES_GROUP_PATHS);
}

Before({tags: '@setup_groups_lite_feature'}, async function () {
    await teardown_groups_lite_feature();
});

Before({tags: '@teardown_groups_lite_feature'}, async function () {
    await teardown_groups_lite_feature();
});

async function teardown_groupMembers_feature() {
    await deleteAssetLibraryDevices(GROUPMEMBERS_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(GROUPMEMBERS_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, GROUPMEMBERS_FEATURE_DEVICE_TEMPLATE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_groupMembers_feature'}, async function () {

    // teardown first just in case
    await teardown_groupMembers_feature();

    // now go through the setup steps
    const groupType:TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0],
        category: 'group'
    };
    await templates.createTemplate(groupType);
    await templates.publishTemplate(CategoryEnum.group, GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0]);

    const linkableDeviceTypeA:TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A,
        category: 'device',
        relations: {
            out: {
                located_at: [GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0]]
            }
        }
    };
    await templates.createTemplate(linkableDeviceTypeA);
    await templates.publishTemplate(CategoryEnum.device, GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A);

    const linkableDeviceTypeB:TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B,
        category: 'device',
        relations: {
            out: {
                located_at: [GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0]]
            }
        }
    };
    await templates.createTemplate(linkableDeviceTypeB);
    await templates.publishTemplate(CategoryEnum.device, GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B);

    const unlinkableDeviceType:TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID,
        category: 'device'
    };
    await templates.createTemplate(unlinkableDeviceType);
    await templates.publishTemplate(CategoryEnum.device, GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID);
});

Before({tags: '@teardown_groupMembers_feature'}, async function () {
    await teardown_groupMembers_feature();
});

async function teardown_groupMembers_lite_feature() {
    await deleteAssetLibraryDevices(GROUPMEMBERS_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(GROUPMEMBERS_LITE_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_IDS);
}

Before({tags: '@setup_groupMembers_lite_feature'}, async function () {

    // teardown first just in case
    await teardown_groupMembers_lite_feature();

    // now go through the setup steps
    const deviceTypeA:TypeResource = {
        templateId: GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A,
        category: 'device'
    };
    await templates.createTemplate(deviceTypeA);

    const deviceTypeB:TypeResource = {
        templateId: GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B,
        category: 'device'
    };
    await templates.createTemplate(deviceTypeB);

});

Before({tags: '@teardown_groupMembers_lite_feature'}, async function () {
    await teardown_groupMembers_lite_feature();
});

async function teardown_deviceSearch_feature() {
    await deleteAssetLibraryDevices(DEVICESEARCH_FEATURES_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICESEARCH_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS);
}

Before({tags: '@setup_deviceSearch_feature'}, async function () {

    // teardown first just in case
    await teardown_deviceSearch_feature();

    // now go through the setup steps
    const deviceType:TypeResource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        category: 'device',
        properties: {
            pair: { type: ['string']},
            position: { type: ['number']}
        },
        relations: {
            out: {
                'located_at': ['root']
            }
        }
    };
    await templates.createTemplate(deviceType);
    await templates.publishTemplate(CategoryEnum.device, DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0]);

    const group:Group = {
        templateId: 'root',
        parentPath: '/',
        name: 'deviceSearch_feature',
        attributes: {}
    };
    await groups.createGroup(group);

    const device:Device = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        deviceId: DEVICESEARCH_FEATURES_DEVICE_ID_1A,
        attributes: {
            pair: 'black-black',
            position: 1
        },
        groups: {
            'located_at': DEVICESEARCH_FEATURES_GROUPS_PATHS
        }
    };
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_1B;
    device.attributes.pair = 'black-white';
    device.attributes.position = 2;
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2A;
    device.attributes.pair = 'white-red';
    device.attributes.position = 3;
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2B;
    device.attributes.pair = 'red-white';
    device.attributes.position = 4;
    await devices.createDevice(device);

});

Before({tags: '@teardown_deviceSearch_feature'}, async function () {
    await teardown_deviceSearch_feature();
});

async function teardown_deviceSearch_lite_feature() {
    await deleteAssetLibraryDevices(DEVICESEARCH_FEATURES_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS);
}

Before({tags: '@setup_deviceSearch_lite_feature'}, async function () {

    // teardown first just in case
    await teardown_deviceSearch_lite_feature();

    // now go through the setup steps
    const deviceType:TypeResource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        category: 'device',
        properties: {
            pair: { type: ['string']},
            position: { type: ['string']}
        }
    };
    await templates.createTemplate(deviceType);

    const group:Group = {
        name: DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS[0],
        attributes: {}
    };
    await groups.createGroup(group);

    const device:Device = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        deviceId: DEVICESEARCH_FEATURES_DEVICE_ID_1A,
        attributes: {
            pair: 'black-black',
            position: '1'
        },
        groups: {
            'group': [DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS[0]]
        }
    };
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_1B;
    device.attributes.pair = 'black-white';
    device.attributes.position = '2';
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2A;
    device.attributes.pair = 'white-red';
    device.attributes.position = '3';
    await devices.createDevice(device);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2B;
    device.attributes.pair = 'red-white';
    device.attributes.position = '4';
    await devices.createDevice(device);

    // wait a short while for indexing to catch up
    return new Promise( resolve => setTimeout(resolve, 10000) );

});

Before({tags: '@teardown_deviceSearch_lite_feature'}, async function () {
    await teardown_deviceSearch_lite_feature();
});

async function teardown_groupSearch_feature() {
    await deleteAssetLibraryGroups(GROUPSEARCH_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS);
}

Before({tags: '@setup_groupSearch_feature'}, async function () {

    // teardown first just in case
    await teardown_groupSearch_feature();

    // now go through the setup steps
    const groupType:TypeResource = {
        templateId: GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0],
        category: 'group',
        properties: {
            pair: { type: ['string']},
            position: { type: ['number']}
        }
    };
    await templates.createTemplate(groupType);
    await templates.publishTemplate(CategoryEnum.group, GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0]);

    const group:Group = {
        templateId: 'root',
        parentPath: '/',
        name: 'groupSearch_feature',
        attributes: {}
    };
    await groups.createGroup(group);

    const childGroup:Group = {
        templateId: GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0],
        parentPath: '/groupSearch_feature',
        name: 'AA',
        attributes: {
            pair: 'black-black',
            position: 1
        }
    };
    await groups.createGroup(childGroup);

    childGroup.name = 'AB';
    childGroup.attributes.pair = 'black-white';
    childGroup.attributes.position = 2;
    await groups.createGroup(childGroup);

    childGroup.name = 'BA';
    childGroup.attributes.pair = 'white-red';
    childGroup.attributes.position = 3;
    await groups.createGroup(childGroup);

    childGroup.name = 'BB';
    childGroup.attributes.pair = 'red-white';
    childGroup.attributes.position = 4;
    await groups.createGroup(childGroup);

});

Before({tags: '@teardown_groupSearch_feature'}, async function () {
    await teardown_groupSearch_feature();
});

async function teardown_groupSearch_lite_feature() {
    await deleteAssetLibraryGroups(GROUPSEARCH_LITE_FEATURES_GROUPS_PATHS);
}

Before({tags: '@setup_groupSearch_lite_feature'}, async function () {

    // teardown first just in case
    await teardown_groupSearch_lite_feature();

    // now go through the setup steps
    const group:Group = {
        name: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT,
        attributes: {}
    };
    await groups.createGroup(group);

    const childGroup:Group = {
        parentPath: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT,
        name: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA,
        attributes: {
            pair: 'black-black',
            position: '1'
        }
    };
    await groups.createGroup(childGroup);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB;
    childGroup.attributes.pair = 'black-white';
    childGroup.attributes.position = '2';
    await groups.createGroup(childGroup);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA;
    childGroup.attributes.pair = 'white-red';
    childGroup.attributes.position = '3';
    await groups.createGroup(childGroup);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB;
    childGroup.attributes.pair = 'red-white';
    childGroup.attributes.position = '4';
    await groups.createGroup(childGroup);

    // wait a short while for indexing to catch up
    return new Promise( resolve => setTimeout(resolve, 10000) );

});

Before({tags: '@teardown_groupSearch_lite_feature'}, async function () {
    await teardown_groupSearch_lite_feature();
});
