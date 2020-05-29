/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import {
    ProfilesService,
    DeviceProfile10Resource,
    GroupProfile10Resource,
    ASSTLIBRARY_CLIENT_TYPES,
} from '@cdf/assetlibrary-client/dist';
import stringify from 'json-stable-stringify';
import { fail } from 'assert';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
use(chai_string);
import { RESPONSE_STATUS, AUTHORIZATION_TOKEN } from '../common/common.steps';
import {container} from '../../di/inversify.config';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';

setDefaultTimeout(10 * 1000);


const profileService:ProfilesService = container.get(ASSTLIBRARY_CLIENT_TYPES.ProfilesService);
const additionalHeaders:Dictionary = {
    Authorization: this[AUTHORIZATION_TOKEN]
};

function isDevice(category:string) {
    return category==='device';
}

function isGroup(category:string) {
    return category==='group';
}

Given('assetlibrary {word} profile {string} of {string} does not exist', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await profileService.getDeviceProfile(templateId, profileId, additionalHeaders);
        } else if (isGroup(category)) {
            await profileService.getGroupProfile(templateId, profileId, additionalHeaders);
        }
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('assetlibrary {word} profile {string} of {string} exists', async function (category:string, profileId:string, templateId:string) {
    let profile;
    if (isDevice(category)) {
        profile = await profileService.getDeviceProfile(templateId, profileId, additionalHeaders);
    } else if (isGroup(category)) {
        profile = await profileService.getGroupProfile(templateId, profileId, additionalHeaders);
    }
    expect(profile.profileId).equalIgnoreCase(profileId);
});

When('I create the assetlibrary {word} profile {string} of {string} with attributes', async function (category:string, profileId:string, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    const profile = {
        profileId,
        templateId
    };

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            profile[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            profile[key] = null;
        } else if (value==='___undefined___') {
            delete profile[key];
        } else {
            profile[key] = d[key];
        }
    });

    try {
        if (isDevice(category)) {
            await profileService.createDeviceProfile(profile, additionalHeaders);
        } else if (isGroup(category)) {
            await profileService.createGroupProfile(profile, additionalHeaders);
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete assetlibrary {word} profile {string} of {string}', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await profileService.deleteDeviceProfile(templateId, profileId, additionalHeaders);
        } else if (isGroup(category)) {
            await profileService.deleteGroupProfile(templateId, profileId, additionalHeaders);
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('assetlibrary {word} profile {string} of {string} exists with attributes', async function (category:string, profileId:string, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    let r:DeviceProfile10Resource|GroupProfile10Resource;
    if (isDevice(category)) {
        r = await profileService.getDeviceProfile(templateId, profileId, additionalHeaders);
    } else if (isGroup(category)) {
        r = await profileService.getGroupProfile(templateId, profileId, additionalHeaders);
    }

    Object.keys(d).forEach( key => {
        const val = d[key];
        if (val.startsWith('{') || val.startsWith('[')) {
            expect(stringify(r[key])).eq( stringify(JSON.parse(val)));
        } else if (val==='___null___') {
            expect(r[key]).eq(null);
        } else if (val==='___undefined___') {
            expect(r[key]).eq(undefined);
        } else {
            expect(r[key]).eq( val);
        }
    });
});
