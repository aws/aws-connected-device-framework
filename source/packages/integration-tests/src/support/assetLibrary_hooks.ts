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
import {
    ASSETLIBRARY_CLIENT_TYPES,
    CategoryEnum,
    Device20Resource,
    DevicesService,
    Group20Resource,
    GroupsService,
    ProfilesService,
    RequestHeaders,
    TemplatesService,
    TypeResource,
} from '@awssolutions/cdf-assetlibrary-client';
import { Before, setDefaultTimeout } from '@cucumber/cucumber';
import { sign } from 'jsonwebtoken';
import { container } from '../di/inversify.config';
import { AUTHORIZATION_TOKEN } from '../step_definitions/common/common.steps';

setDefaultTimeout(30 * 1000);

const DEVICES_FEATURE_DEVICE_IDS = [
    'TEST-devices-device001',
    'TEST-devices-device002',
    'TEST-devices-device003',
    'TEST-devices-device004',
    'TEST-devices-linkableDevice001',
];
const DEVICES_FEATURE_LINKABLE_GROUP_PATH = '/TEST-devices-linkableGroup001';
const DEVICES_FEATURE_UNLINKABLE_GROUP_PATH = '/TEST-devices-unlinkableGroup001';
const DEVICES_FEATURE_GROUP_PATHS = [
    DEVICES_FEATURE_LINKABLE_GROUP_PATH,
    DEVICES_FEATURE_UNLINKABLE_GROUP_PATH,
    '/unprovisioned',
];
const DEVICES_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID = 'TEST-devices-linkableDevice';
const DEVICES_FEATURE_DEVICE_TEMPLATE_IDS = [
    'TEST-devices-type',
    DEVICES_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID,
];
const DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID = 'TEST-devices-linkableGroup';
const DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID = 'TEST-devices-unlinkableGroup';
const DEVICES_FEATURE_GROUP_TEMPLATE_IDS = [
    DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
    DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
];

const DEVICES_FEATURE_LITE_DEVICE_IDS = ['TEST-devices-device001', 'TEST-devices-device002'];
const DEVICES_FEATURE_LITE_GROUP_PATH = 'TEST-devices-group001';
const DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH = 'unprovisioned';
const DEVICES_FEATURE_LITE_GROUP_PATHS = [
    DEVICES_FEATURE_LITE_GROUP_PATH,
    DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH,
];
const DEVICES_FEATURE_LITE_DEVICE_TEMPLATE_IDS = ['TEST-devices-type'];

const DEVICEPROFILES_FEATURE_DEVICE_IDS = [
    'TEST-deviceProfiles-device001',
    'TEST-deviceProfiles-device002',
    'TEST-deviceProfiles-device003',
    'TEST-deviceProfiles-device004',
];
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH = '/TEST-deviceProfiles-linkableGroup001';
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH = '/TEST-deviceProfiles-linkableGroup002';
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_3_PATH = '/TEST-deviceProfiles-linkableGroup003';

const DEVICEPROFILES_FEATURE_GROUP_PATHS = [
    DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH,
    DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH,
    DEVICEPROFILES_FEATURE_LINKABLE_GROUP_3_PATH,
];
const DEVICEPROFILES_FEATURE_DEVICE_TEMPLATE_IDS = ['TEST-deviceProfiles-type'];
const DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID = 'TEST-deviceProfiles-linkableGroup';
const DEVICEPROFILES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID = 'TEST-deviceProfiles-unlinkableGroup';
const DEVICEPROFILES_FEATURE_GROUP_TEMPLATE_IDS = [
    DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
    DEVICEPROFILES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
];
const DEVICEPROFILES_FEATURE_DEVICE_PROFILE_IDS = [
    'TEST-deviceProfiles-type___TEST-deviceProfiles-profile',
    'TEST-deviceProfiles-type___TEST-deviceProfiles-profile-invalid',
];

const BULKDEVICES_FEATURE_GROUP_TEMPLATE_ID = 'TEST-bulkdevices-group';
const BULKDEVICES_FEATURE_GROUP_PATH = '/bulkdevices';
const BULKDEVICES_FEATURE_DEVICE_TEMPLATE_ID = 'TEST-bulkdevices-type';
const BULKDEVICES_FEATURE_DEVICE_IDS = [
    'TEST-bulkdevices-device001',
    'TEST-bulkdevices-device002',
    'TEST-bulkdevices-device003',
];

const GROUPPROFILES_FEATURE_GROUP_PATHS = [
    '/test-groupprofiles-group001',
    '/test-groupprofiles-group002',
    '/test-groupprofiles-group003',
    '/test-groupprofiles-group004',
    '/test-groupprofiles-group005',
];
const GROUPPROFILES_FEATURE_GROUP_TEMPLATE_IDS = ['TEST-groupProfiles-type'];
const GROUPPROFILES_FEATURE_GROUP_PROFILE_IDS = [
    'TEST-groupProfiles-type___TEST-groupProfiles-profile',
    'TEST-groupProfiles-type___TEST-groupProfiles-profile-invalid',
];

const GROUPS_FEATURES_GROUP_PATHS = [
    '/TEST-groups-group001',
    '/TEST-groups-group002',
    '/TEST-groups-group003',
    '/TEST-groups-group004',
    '/TEST-groups-group005',
    '/TEST-groups-group006',
];
const GROUP_FEATURES_GROUP_TEMPLATE_IDS = [
    'TEST-groups-groupTemplate001',
    'TEST-groups-groupTemplate002',
];

const GROUPS_LITE_FEATURES_GROUP_PATHS = ['TEST-groups-group001'];

const GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS = ['TEST-groupMembers-group'];
const GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A =
    'TEST-groupMembers-deviceLinkableToGroupA';
const GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B =
    'TEST-groupMembers-deviceLinkableToGroupB';
const GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID =
    'TEST-groupMembers-deviceNotLinkableToGroup';
const GROUPMEMBERS_FEATURE_DEVICE_TEMPLATE_IDS = [
    GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A,
    GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B,
    GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID,
];
const GROUPMEMBERS_FEATURE_GROUP_PATHS = [
    '/test-groupmembers-parent/child1',
    '/test-groupmembers-parent/child2',
    '/test-groupmembers-parent',
];
const GROUPMEMBERS_FEATURE_DEVICE_IDS = [
    'TEST-groupMembers-device001',
    'TEST-groupMembers-device002',
    'TEST-groupMembers-device003',
];

const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A = 'TEST-groupMembers-deviceTypeA-012';
const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B = 'TEST-groupMembers-deviceTypeB-012';
const GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_IDS = [
    GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A,
    GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B,
];
const GROUPMEMBERS_LITE_FEATURE_GROUP_PATHS = ['child1', 'child2', 'TEST-groupMembers-parent'];

const DEVICESEARCH_FEATURES_DEVICE_ID_1A = 'TEST-deviceSearch-001A';
const DEVICESEARCH_FEATURES_DEVICE_ID_1B = 'TEST-deviceSearch-001B';
const DEVICESEARCH_FEATURES_DEVICE_ID_2A = 'TEST-deviceSearch-002A';
const DEVICESEARCH_FEATURES_DEVICE_ID_2B = 'TEST-deviceSearch-002B';
const DEVICESEARCH_FEATURES_DEVICE_IDS = [
    DEVICESEARCH_FEATURES_DEVICE_ID_1A,
    DEVICESEARCH_FEATURES_DEVICE_ID_1B,
    DEVICESEARCH_FEATURES_DEVICE_ID_2A,
    DEVICESEARCH_FEATURES_DEVICE_ID_2B,
];
const DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS = ['TEST-deviceSearch-device-004'];
const DEVICESEARCH_FEATURES_GROUPS_PATHS = ['/deviceSearch_feature'];

const DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS = ['deviceSearch_feature'];

const GROUPSEARCH_FEATURES_GROUP_PATH_ROOT = '/groupSearch_feature';
const GROUPSEARCH_FEATURES_GROUP_PATH_AA = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/AA`;
const GROUPSEARCH_FEATURES_GROUP_PATH_AB = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/AB`;
const GROUPSEARCH_FEATURES_GROUP_PATH_BA = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/BA`;
const GROUPSEARCH_FEATURES_GROUP_PATH_BB = `${GROUPSEARCH_FEATURES_GROUP_PATH_ROOT}/BB`;
const GROUPSEARCH_FEATURES_GROUPS_PATHS = [
    GROUPSEARCH_FEATURES_GROUP_PATH_AA,
    GROUPSEARCH_FEATURES_GROUP_PATH_AB,
    GROUPSEARCH_FEATURES_GROUP_PATH_BA,
    GROUPSEARCH_FEATURES_GROUP_PATH_BB,
    GROUPSEARCH_FEATURES_GROUP_PATH_ROOT,
];
const GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS = ['TEST-groupSearch-group'];

const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT = 'groupSearch_feature';
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA = `AA`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB = `AB`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA = `BA`;
const GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB = `BB`;
const GROUPSEARCH_LITE_FEATURES_GROUPS_PATHS = [
    GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA,
    GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB,
    GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA,
    GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB,
    GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT,
];

const DELETE_RELATED_GROUPS_ROOT_TEMPLATE = 'TEST-drg-groupTemplate001';
const DELETE_RELATED_GROUPS_LOOP_TEMPLATE = 'TEST-drg-groupTemplate002';

const DEVICES2_GROUP_TEMPLATE = 'TEST-devices2-groupTemplate001';

const devicesService: DevicesService = container.get(ASSETLIBRARY_CLIENT_TYPES.DevicesService);
const groupsService: GroupsService = container.get(ASSETLIBRARY_CLIENT_TYPES.GroupsService);
const templatesService: TemplatesService = container.get(
    ASSETLIBRARY_CLIENT_TYPES.TemplatesService
);
const profilesService: ProfilesService = container.get(ASSETLIBRARY_CLIENT_TYPES.ProfilesService);

/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const adminClaims: { [key: string]: string[] } = {
    cdf_al: ['/:*'],
};
const authToken = sign(adminClaims, 'shared-secret');
const additionalHeaders: RequestHeaders = {
    authz: authToken,
};

async function deleteAssetLibraryTemplates(category: CategoryEnum, ids: string[]) {
    for (const id of ids) {
        await templatesService.deleteTemplate(category, id, additionalHeaders).catch((err) => {
            // ignore error in case it did not already exist
            if (err.status !== 404) {
                throw err;
            }
        });

        // NOTE: deleted templates don't need publishing
        // await templatesService.publishTemplate(category, id)
        //     .catch(_err=> {
        //         // ignore error in case it did not already exist
        //     });
    }
}

async function deleteAssetLibraryDeviceProfiles(ids: string[]) {
    for (const id of ids) {
        const ids_split = id.split('___');
        await profilesService
            .deleteDeviceProfile(ids_split[0], ids_split[1], additionalHeaders)
            .catch((err) => {
                // ignore error in case it did not already exist
                if (err.status !== 404) {
                    throw err;
                }
            });
    }
}

async function deleteAssetLibraryGroupProfiles(ids: string[]) {
    for (const id of ids) {
        const ids_split = id.split('___');
        await profilesService
            .deleteGroupProfile(ids_split[0], ids_split[1], additionalHeaders)
            .catch((err) => {
                // ignore error in case it did not already exist
                if (err.status !== 404) {
                    throw err;
                }
            });
    }
}

async function deleteAssetLibraryDevices(ids: string[]) {
    for (const id of ids) {
        await devicesService.deleteDevice(id, additionalHeaders).catch((err) => {
            // ignore error in case it did not already exist
            if (err.status !== 404) {
                throw err;
            }
        });
    }
}

async function deleteAssetLibraryGroups(paths: string[]) {
    for (const path of paths) {
        await groupsService.deleteGroup(path, additionalHeaders).catch((err) => {
            // ignore error in case it did not already exist
            if (err.status !== 404) {
                throw err;
            }
        });
    }
}

async function teardown_devices_feature() {
    await deleteAssetLibraryDevices(DEVICES_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICES_FEATURE_DEVICE_TEMPLATE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, DEVICES_FEATURE_GROUP_TEMPLATE_IDS);
}

async function create_root_authorized_group_template(templateId: string) {
    const groupType: TypeResource = {
        templateId: templateId,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    await templatesService.createTemplate(groupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType.relations.out.parent.push({
        name: templateId,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType, additionalHeaders);

    await templatesService.publishTemplate(CategoryEnum.group, templateId, additionalHeaders);
}

Before({ tags: '@setup_devices2_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    const groupType: TypeResource = {
        templateId: DEVICES2_GROUP_TEMPLATE,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    await templatesService.createTemplate(groupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType.relations.out.parent.push({
        name: DEVICES2_GROUP_TEMPLATE,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType, additionalHeaders);

    await templatesService.publishTemplate(
        CategoryEnum.group,
        DEVICES2_GROUP_TEMPLATE,
        additionalHeaders
    );
});

Before({ tags: '@setup_devices_feature' }, async function () {
    await teardown_devices_feature();

    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    const linkableGroupType: TypeResource = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    await templatesService.createTemplate(linkableGroupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    linkableGroupType.relations.out.parent.push({
        name: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(linkableGroupType, additionalHeaders);

    await templatesService.publishTemplate(
        CategoryEnum.group,
        DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        additionalHeaders
    );

    // create linkable group
    const linkableGroup: Group20Resource = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICES_FEATURE_LINKABLE_GROUP_PATH.substring(1),
        attributes: {},
    };
    await groupsService.createGroup(linkableGroup, undefined, additionalHeaders);
    // create unprovisioned group
    const unprovisionedGroup: Group20Resource = {
        templateId: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: 'unprovisioned',
        attributes: {},
    };
    await groupsService.createGroup(unprovisionedGroup, undefined, additionalHeaders);

    // create unlinkable group template
    const unlinkableGroupType: TypeResource = {
        templateId: DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(unlinkableGroupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    unlinkableGroupType.relations.out.parent.push({
        name: DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        includeInAuth: true,
    });

    await templatesService.updateTemplate(unlinkableGroupType, additionalHeaders);

    await templatesService.publishTemplate(
        CategoryEnum.group,
        DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        additionalHeaders
    );

    // create unlinkable group template
    const unlinkableGroup: Group20Resource = {
        templateId: DEVICES_FEATURE_UNLINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICES_FEATURE_UNLINKABLE_GROUP_PATH.substring(1),
        attributes: {},
    };
    await groupsService.createGroup(unlinkableGroup, undefined, additionalHeaders);

    // create linkable device template
    const linkableDeviceType: TypeResource = {
        templateId: DEVICES_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID,
        category: 'device',
        relations: {
            out: {
                parent: [
                    {
                        name: DEVICES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(linkableDeviceType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        DEVICES_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID,
        additionalHeaders
    );

    // create linkable device
    const linkableDevice: Device20Resource = {
        templateId: linkableDeviceType.templateId,
        deviceId: 'TEST-devices-linkableDevice001',
        attributes: {},
        groups: {
            out: {
                parent: ['/unprovisioned'],
            },
        },
    };
    await devicesService.createDevice(linkableDevice, undefined, additionalHeaders);
});

Before({ tags: '@setup_deleteRelatedGroups_feature', timeout: 60000 }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    const groupType: TypeResource = {
        templateId: DELETE_RELATED_GROUPS_ROOT_TEMPLATE,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    await templatesService.createTemplate(groupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType.relations.out.parent.push({
        name: DELETE_RELATED_GROUPS_ROOT_TEMPLATE,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType, additionalHeaders);

    await templatesService.publishTemplate(
        CategoryEnum.group,
        DELETE_RELATED_GROUPS_ROOT_TEMPLATE,
        additionalHeaders
    );

    const groupType2: TypeResource = {
        templateId: DELETE_RELATED_GROUPS_LOOP_TEMPLATE,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
            in: {
                authPath: [
                    {
                        name: DELETE_RELATED_GROUPS_ROOT_TEMPLATE,
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    await templatesService.createTemplate(groupType2, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType2.relations.out.parent.push({
        name: DELETE_RELATED_GROUPS_LOOP_TEMPLATE,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType2, additionalHeaders);

    await templatesService.publishTemplate(
        CategoryEnum.group,
        DELETE_RELATED_GROUPS_LOOP_TEMPLATE,
        additionalHeaders
    );
});

Before({ tags: '@teardown_devices_feature' }, async function () {
    await teardown_devices_feature();
});

async function teardown_devicesWithAuth_feature() {
    await deleteAssetLibraryDevices([
        'TEST-devicesWithAuth-device001',
        'TEST-devicesWithAuth-device002',
        'TEST-devicesWithAuth-device003',
    ]);
    await deleteAssetLibraryGroups(['/1/2/2', '/1/2/1', '/1/1/2', '/1/1/1', '/1/2', '/1/1', '/1']);
    await deleteAssetLibraryTemplates(CategoryEnum.device, ['TEST-devicesWithAuthDevice']);
    await deleteAssetLibraryTemplates(CategoryEnum.group, ['TEST-devicesWithAuthGroup']);
}

Before({ tags: '@setup_devicesWithAuth_feature', timeout: 60000 }, async function () {
    await teardown_devicesWithAuth_feature();

    // create linkable group template
    const groupTemplateId = 'TEST-devicesWithAuthGroup';
    const groupType: TypeResource = {
        templateId: groupTemplateId,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(groupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType.relations.out.parent.push({
        name: groupTemplateId,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType, additionalHeaders);

    await templatesService.publishTemplate(CategoryEnum.group, groupTemplateId, additionalHeaders);

    // create group hierarchy
    const g1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/',
        name: '1',
        attributes: {},
    };
    const g1_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1',
        name: '1',
        attributes: {},
    };
    const g1_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1',
        name: '2',
        attributes: {},
    };
    const g1_1_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/1',
        name: '1',
        attributes: {},
    };
    const g1_1_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/1',
        name: '2',
        attributes: {},
    };
    const g1_2_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/2',
        name: '1',
        attributes: {},
    };
    const g1_2_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/2',
        name: '2',
        attributes: {},
    };
    await groupsService.bulkCreateGroup(
        { groups: [g1, g1_1, g1_2, g1_1_1, g1_1_2, g1_2_1, g1_2_2] },
        undefined,
        additionalHeaders
    );

    // create a device template
    const deviceTemplateId = 'TEST-devicesWithAuthDevice';
    const deviceType: TypeResource = {
        templateId: deviceTemplateId,
        category: 'device',
        properties: {
            model: { type: ['string'] },
        },
        relations: {
            out: {
                linked_to: [
                    {
                        name: groupTemplateId,
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(deviceType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        deviceTemplateId,
        additionalHeaders
    );
});

Before({ tags: '@teardown_devicesWithAuth_feature' }, async function () {
    await teardown_devicesWithAuth_feature();
});

async function teardown_devices_feature_lite() {
    await deleteAssetLibraryDevices(DEVICES_FEATURE_LITE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICES_FEATURE_LITE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        DEVICES_FEATURE_LITE_DEVICE_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_devices_feature_lite' }, async function () {
    await teardown_devices_feature_lite();

    // create  group
    const group: Group20Resource = {
        name: DEVICES_FEATURE_LITE_GROUP_PATH,
        attributes: {},
    };
    await groupsService.createGroup(group);

    // create unprovisioned group
    const unprovisionedGroup: Group20Resource = {
        name: DEVICES_FEATURE_LITE_UNPROVISIONED_GROUP_PATH,
        attributes: {},
    };
    await groupsService.createGroup(unprovisionedGroup, undefined, additionalHeaders);
});

Before({ tags: '@teardown_devices_feature_lite' }, async function () {
    await teardown_devices_feature_lite();
});

async function teardown_bulkdevices_feature() {
    await deleteAssetLibraryDevices(BULKDEVICES_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, [
        BULKDEVICES_FEATURE_DEVICE_TEMPLATE_ID,
    ]);
    await deleteAssetLibraryGroups([BULKDEVICES_FEATURE_GROUP_PATH]);
    await deleteAssetLibraryTemplates(CategoryEnum.group, [BULKDEVICES_FEATURE_GROUP_TEMPLATE_ID]);
}

Before({ tags: '@setup_bulkdevices_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    await teardown_bulkdevices_feature();

    // create group template
    await create_root_authorized_group_template(BULKDEVICES_FEATURE_GROUP_TEMPLATE_ID);

    // create unprovisioned group
    const bulkdevicesGroup: Group20Resource = {
        templateId: BULKDEVICES_FEATURE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: BULKDEVICES_FEATURE_GROUP_PATH.substring(1),
        attributes: {},
    };
    await groupsService.createGroup(bulkdevicesGroup, undefined, additionalHeaders);

    // create device template
    const testDeviceTemplate: TypeResource = {
        templateId: BULKDEVICES_FEATURE_DEVICE_TEMPLATE_ID,
        category: 'device',
        properties: {
            stringAttribute: { type: ['string'] },
            numberAttribute: { type: ['number'] },
        },
        relations: {
            out: {
                member_of: [{ name: BULKDEVICES_FEATURE_GROUP_TEMPLATE_ID, includeInAuth: true }],
            },
        },
    };

    await templatesService.createTemplate(testDeviceTemplate, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        BULKDEVICES_FEATURE_DEVICE_TEMPLATE_ID,
        additionalHeaders
    );
});

Before({ tags: '@teardown_bulkdevices_feature' }, async function () {
    await teardown_bulkdevices_feature();
});

async function teardown_deviceProfiles_feature() {
    await deleteAssetLibraryDeviceProfiles(DEVICEPROFILES_FEATURE_DEVICE_PROFILE_IDS);
    await deleteAssetLibraryDevices(DEVICEPROFILES_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICEPROFILES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        DEVICEPROFILES_FEATURE_DEVICE_TEMPLATE_IDS
    );
    await deleteAssetLibraryTemplates(
        CategoryEnum.group,
        DEVICEPROFILES_FEATURE_GROUP_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_deviceProfiles_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    await teardown_deviceProfiles_feature();

    // create linkable group template
    await create_root_authorized_group_template(DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID);

    // create linkable group 1
    const linkableGroup: Group20Resource = {
        templateId: DEVICEPROFILES_FEATURE_LINKABLE_GROUP_TEMPLATE_ID,
        parentPath: '/',
        name: DEVICEPROFILES_FEATURE_LINKABLE_GROUP_1_PATH.substring(1),
        attributes: {},
    };
    await groupsService.createGroup(linkableGroup, undefined, additionalHeaders);

    // create linkable group 2
    linkableGroup.name = DEVICEPROFILES_FEATURE_LINKABLE_GROUP_2_PATH.substring(1);
    await groupsService.createGroup(linkableGroup, undefined, additionalHeaders);

    // create linkable group 3
    linkableGroup.name = DEVICEPROFILES_FEATURE_LINKABLE_GROUP_3_PATH.substring(1);
    await groupsService.createGroup(linkableGroup, undefined, additionalHeaders);
});

Before({ tags: '@teardown_deviceProfiles_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    await teardown_deviceProfiles_feature();
});

async function teardown_groupProfiles_feature() {
    await deleteAssetLibraryGroupProfiles(GROUPPROFILES_FEATURE_GROUP_PROFILE_IDS);
    await deleteAssetLibraryGroups(GROUPPROFILES_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.group,
        GROUPPROFILES_FEATURE_GROUP_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_groupProfiles_feature' }, async function () {
    await teardown_groupProfiles_feature();
});

Before({ tags: '@teardown_groupProfiles_feature' }, async function () {
    await teardown_groupProfiles_feature();
});

async function teardown_groups_feature() {
    await deleteAssetLibraryGroups(GROUPS_FEATURES_GROUP_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUP_FEATURES_GROUP_TEMPLATE_IDS);
    await deleteAssetLibraryTemplates(CategoryEnum.device, DEVICES_FEATURE_DEVICE_TEMPLATE_IDS);
}

Before({ tags: '@setup_groups_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    await teardown_groups_feature();
});

Before({ tags: '@teardown_groups_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    await teardown_groups_feature();
});

async function teardown_groups_lite_feature() {
    await deleteAssetLibraryGroups(GROUPS_LITE_FEATURES_GROUP_PATHS);
}

Before({ tags: '@setup_groups_lite_feature' }, async function () {
    await teardown_groups_lite_feature();
});

Before({ tags: '@teardown_groups_lite_feature' }, async function () {
    await teardown_groups_lite_feature();
});

async function teardown_groupMembers_feature() {
    await deleteAssetLibraryDevices(GROUPMEMBERS_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(GROUPMEMBERS_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        GROUPMEMBERS_FEATURE_DEVICE_TEMPLATE_IDS
    );
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS);
}

Before({ tags: '@setup_groupMembers_feature' }, async function () {
    // teardown first just in case
    await teardown_groupMembers_feature();

    // now go through the setup steps
    const groupType: TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0],
        category: 'group',
    };
    await templatesService.createTemplate(groupType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.group,
        GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0],
        additionalHeaders
    );

    const linkableDeviceTypeA: TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A,
        category: 'device',
        relations: {
            out: {
                located_at: [GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0]],
            },
        },
    };
    await templatesService.createTemplate(linkableDeviceTypeA, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_A,
        additionalHeaders
    );

    const linkableDeviceTypeB: TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B,
        category: 'device',
        relations: {
            out: {
                located_at: [GROUPMEMBERS_FEATURE_GROUP_TEMPLATE_IDS[0]],
            },
        },
    };
    await templatesService.createTemplate(linkableDeviceTypeB, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        GROUPMEMBERS_FEATURE_LINKABLE_DEVICE_TEMPLATE_ID_B,
        additionalHeaders
    );

    const unlinkableDeviceType: TypeResource = {
        templateId: GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID,
        category: 'device',
    };
    await templatesService.createTemplate(unlinkableDeviceType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        GROUPMEMBERS_FEATURE_NOTLINKABLE_DEVICE_TEMPLATE_ID,
        additionalHeaders
    );
});

Before({ tags: '@teardown_groupMembers_feature' }, async function () {
    await teardown_groupMembers_feature();
});

async function teardown_groupMembers_lite_feature() {
    await deleteAssetLibraryDevices(GROUPMEMBERS_FEATURE_DEVICE_IDS);
    await deleteAssetLibraryGroups(GROUPMEMBERS_LITE_FEATURE_GROUP_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_groupMembers_lite_feature' }, async function () {
    // teardown first just in case
    await teardown_groupMembers_lite_feature();

    // now go through the setup steps
    const deviceTypeA: TypeResource = {
        templateId: GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_A,
        category: 'device',
    };
    await templatesService.createTemplate(deviceTypeA, additionalHeaders);

    const deviceTypeB: TypeResource = {
        templateId: GROUPMEMBERS_LITE_FEATURE_DEVICE_TEMPLATE_ID_B,
        category: 'device',
    };
    await templatesService.createTemplate(deviceTypeB, additionalHeaders);
});

Before({ tags: '@teardown_groupMembers_lite_feature' }, async function () {
    await teardown_groupMembers_lite_feature();
});

async function teardown_deviceSearch_feature() {
    await deleteAssetLibraryDevices(DEVICESEARCH_FEATURES_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICESEARCH_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_deviceSearch_feature' }, async function () {
    // not testing auth here, so everything gets admin access
    this[AUTHORIZATION_TOKEN] = authToken;

    // teardown first just in case
    await teardown_deviceSearch_feature();

    // Update the built-in 'root' group template to support defining a recursive parent relation that
    // is part of auth checks. This allows Group20Resource of type 'root' to have an auth path to its
    // parent, 'root' or '/'
    const rootTemplate: TypeResource = {
        templateId: 'root',
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };

    templatesService.updateTemplate(rootTemplate, additionalHeaders);

    // now go through the setup steps
    const deviceType: TypeResource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        category: 'device',
        properties: {
            pair: { type: ['string'] },
            position: { type: ['number'] },
        },
        relations: {
            out: {
                located_at: [{ name: 'root', includeInAuth: true }],
            },
        },
    };
    await templatesService.createTemplate(deviceType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        additionalHeaders
    );

    const group: Group20Resource = {
        templateId: 'root',
        parentPath: '/',
        name: 'deviceSearch_feature',
        attributes: {},
    };
    await groupsService.createGroup(group, undefined, additionalHeaders);

    const device: Device20Resource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        deviceId: DEVICESEARCH_FEATURES_DEVICE_ID_1A,
        attributes: {
            pair: 'black-black',
            position: 1,
        },
        groups: {
            out: {
                located_at: DEVICESEARCH_FEATURES_GROUPS_PATHS,
            },
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_1B;
    device.attributes.pair = 'black-white';
    device.attributes.position = 2;
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2A;
    device.attributes.pair = 'white-red';
    device.attributes.position = 3;
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2B;
    device.attributes.pair = 'red-white';
    device.attributes.position = 4;
    await devicesService.createDevice(device, undefined, additionalHeaders);
});

Before({ tags: '@teardown_deviceSearch_feature' }, async function () {
    await teardown_deviceSearch_feature();
});

async function teardown_deviceSearchWithAuth_feature() {
    await deleteAssetLibraryDevices([
        'TEST-deviceSearchWithAuth-001A',
        'TEST-deviceSearchWithAuth-001B',
        'TEST-deviceSearchWithAuth-002A',
        'TEST-deviceSearchWithAuth-002B',
    ]);
    await deleteAssetLibraryGroups(['/1/2/2', '/1/2/1', '/1/1/2', '/1/1/1', '/1/2', '/1/1', '/1']);
    await deleteAssetLibraryTemplates(CategoryEnum.device, ['TEST-deviceSearchWithAuthDevice']);
    await deleteAssetLibraryTemplates(CategoryEnum.group, ['TEST-deviceSearchWithAuthGroup']);
}

Before({ tags: '@setup_deviceSearchWithAuth_feature', timeout: 60000 }, async function () {
    // teardown first just in case
    await teardown_deviceSearchWithAuth_feature();

    const groupTemplateId = 'TEST-deviceSearchWithAuthGroup';
    const groupType: TypeResource = {
        templateId: groupTemplateId,
        category: 'group',
        relations: {
            out: {
                parent: [
                    {
                        name: 'root',
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(groupType, additionalHeaders);

    // as this is a self reference, the relation needs to be added post creation
    groupType.relations.out.parent.push({
        name: groupTemplateId,
        includeInAuth: true,
    });
    await templatesService.updateTemplate(groupType, additionalHeaders);

    await templatesService.publishTemplate(CategoryEnum.group, groupTemplateId, additionalHeaders);

    // now go through the setup steps
    const deviceTemplateId = 'TEST-deviceSearchWithAuthDevice';
    const deviceType: TypeResource = {
        templateId: deviceTemplateId,
        category: 'device',
        properties: {
            pair: { type: ['string'] },
            position: { type: ['number'] },
        },
        relations: {
            out: {
                located_at: [
                    {
                        name: groupTemplateId,
                        includeInAuth: true,
                    },
                ],
            },
        },
    };
    await templatesService.createTemplate(deviceType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.device,
        deviceTemplateId,
        additionalHeaders
    );

    // create group hierarchy
    const g1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/',
        name: '1',
        attributes: {},
    };
    const g1_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1',
        name: '1',
        attributes: {},
    };
    const g1_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1',
        name: '2',
        attributes: {},
    };
    const g1_1_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/1',
        name: '1',
        attributes: {},
    };
    const g1_1_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/1',
        name: '2',
        attributes: {},
    };
    const g1_2_1: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/2',
        name: '1',
        attributes: {},
    };
    const g1_2_2: Group20Resource = {
        templateId: groupTemplateId,
        parentPath: '/1/2',
        name: '2',
        attributes: {},
    };
    await groupsService.bulkCreateGroup(
        { groups: [g1, g1_1, g1_2, g1_1_1, g1_1_2, g1_2_1, g1_2_2] },
        undefined,
        additionalHeaders
    );

    const device: Device20Resource = {
        templateId: deviceTemplateId,
        deviceId: 'TEST-deviceSearchWithAuth-001A',
        attributes: {
            pair: 'black-black',
            position: 1,
        },
        groups: {
            out: {
                located_at: ['/1/1/1'],
            },
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = 'TEST-deviceSearchWithAuth-001B';
    device.attributes.pair = 'black-white';
    device.attributes.position = 2;
    device.groups = {
        out: {
            located_at: ['/1/1/2'],
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = 'TEST-deviceSearchWithAuth-002A';
    device.attributes.pair = 'white-red';
    device.attributes.position = 3;
    device.groups = {
        out: {
            located_at: ['/1/2/1'],
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = 'TEST-deviceSearchWithAuth-002B';
    device.attributes.pair = 'red-white';
    device.attributes.position = 4;
    device.groups = {
        out: {
            located_at: ['/1/2/2'],
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);
});

Before({ tags: '@teardown_deviceSearchWithAuth_feature' }, async function () {
    await teardown_deviceSearchWithAuth_feature();
});

async function teardown_deviceSearch_lite_feature() {
    await deleteAssetLibraryDevices(DEVICESEARCH_FEATURES_DEVICE_IDS);
    await deleteAssetLibraryGroups(DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(
        CategoryEnum.device,
        DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS
    );
}

Before({ tags: '@setup_deviceSearch_lite_feature' }, async function () {
    // teardown first just in case
    await teardown_deviceSearch_lite_feature();

    // now go through the setup steps
    const deviceType: TypeResource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        category: 'device',
        properties: {
            pair: { type: ['string'] },
            position: { type: ['string'] },
        },
    };
    await templatesService.createTemplate(deviceType, additionalHeaders);

    const group: Group20Resource = {
        name: DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS[0],
        attributes: {},
    };
    await groupsService.createGroup(group, undefined, additionalHeaders);

    const device: Device20Resource = {
        templateId: DEVICESEARCH_FEATURES_DEVICE_TEMPLATE_IDS[0],
        deviceId: DEVICESEARCH_FEATURES_DEVICE_ID_1A,
        attributes: {
            pair: 'black-black',
            position: '1',
        },
        groups: {
            out: {
                group: [DEVICESEARCH_LITE_FEATURES_GROUPS_PATHS[0]],
            },
        },
    };
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_1B;
    device.attributes.pair = 'black-white';
    device.attributes.position = '2';
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2A;
    device.attributes.pair = 'white-red';
    device.attributes.position = '3';
    await devicesService.createDevice(device, undefined, additionalHeaders);

    device.deviceId = DEVICESEARCH_FEATURES_DEVICE_ID_2B;
    device.attributes.pair = 'red-white';
    device.attributes.position = '4';
    await devicesService.createDevice(device, undefined, additionalHeaders);

    // wait a short while for indexing to catch up
    return new Promise((resolve) => setTimeout(resolve, 10000));
});

Before({ tags: '@teardown_deviceSearch_lite_feature' }, async function () {
    await teardown_deviceSearch_lite_feature();
});

async function teardown_groupSearch_feature() {
    await deleteAssetLibraryGroups(GROUPSEARCH_FEATURES_GROUPS_PATHS);
    await deleteAssetLibraryTemplates(CategoryEnum.group, GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS);
}

Before({ tags: '@setup_groupSearch_feature' }, async function () {
    // teardown first just in case
    await teardown_groupSearch_feature();

    // now go through the setup steps
    const groupType: TypeResource = {
        templateId: GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0],
        category: 'group',
        properties: {
            pair: { type: ['string'] },
            position: { type: ['number'] },
        },
    };
    await templatesService.createTemplate(groupType, additionalHeaders);
    await templatesService.publishTemplate(
        CategoryEnum.group,
        GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0],
        additionalHeaders
    );

    const group: Group20Resource = {
        templateId: 'root',
        parentPath: '/',
        name: 'groupSearch_feature',
        attributes: {},
    };
    await groupsService.createGroup(group, undefined, additionalHeaders);

    const childGroup: Group20Resource = {
        templateId: GROUPSEARCH_FEATURES_GROUP_TEMPLATE_IDS[0],
        parentPath: '/groupSearch_feature',
        name: 'AA',
        attributes: {
            pair: 'black-black',
            position: 1,
        },
    };
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = 'AB';
    childGroup.attributes.pair = 'black-white';
    childGroup.attributes.position = 2;
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = 'BA';
    childGroup.attributes.pair = 'white-red';
    childGroup.attributes.position = 3;
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = 'BB';
    childGroup.attributes.pair = 'red-white';
    childGroup.attributes.position = 4;
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);
});

Before({ tags: '@teardown_groupSearch_feature' }, async function () {
    await teardown_groupSearch_feature();
});

async function teardown_groupSearch_lite_feature() {
    await deleteAssetLibraryGroups(GROUPSEARCH_LITE_FEATURES_GROUPS_PATHS);
}

Before({ tags: '@setup_groupSearch_lite_feature' }, async function () {
    // teardown first just in case
    await teardown_groupSearch_lite_feature();

    // now go through the setup steps
    const group: Group20Resource = {
        name: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT,
        attributes: {},
    };
    await groupsService.createGroup(group, undefined, additionalHeaders);

    const childGroup: Group20Resource = {
        parentPath: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_ROOT,
        name: GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AA,
        attributes: {
            pair: 'black-black',
            position: '1',
        },
    };
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_AB;
    childGroup.attributes.pair = 'black-white';
    childGroup.attributes.position = '2';
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BA;
    childGroup.attributes.pair = 'white-red';
    childGroup.attributes.position = '3';
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    childGroup.name = GROUPSEARCH_LITE_FEATURES_GROUP_PATH_BB;
    childGroup.attributes.pair = 'red-white';
    childGroup.attributes.position = '4';
    await groupsService.createGroup(childGroup, undefined, additionalHeaders);

    // wait a short while for indexing to catch up
    return new Promise((resolve) => setTimeout(resolve, 10000));
});

Before({ tags: '@teardown_groupSearch_lite_feature' }, async function () {
    await teardown_groupSearch_lite_feature();
});
