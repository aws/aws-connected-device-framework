/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import { ProfilesService, DeviceProfile10Resource, GroupProfile10Resource } from '@cdf/assetlibrary-client/dist';
import stringify from 'json-stable-stringify';
import { fail } from 'assert';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
use(chai_string);
import { RESPONSE_STATUS, AUTHORIZATION_TOKEN } from '../common/common.steps';

setDefaultTimeout(10 * 1000);

function getProfilesService() {
    return new ProfilesService({authToken: this[AUTHORIZATION_TOKEN]});
}

function isDevice(category:string) {
    return category==='device';
}

function isGroup(category:string) {
    return category==='group';
}

Given('assetlibrary {word} profile {string} of {string} does not exist', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await getProfilesService().getDeviceProfile(templateId, profileId);
        } else if (isGroup(category)) {
            await getProfilesService().getGroupProfile(templateId, profileId);
        }
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('assetlibrary {word} profile {string} of {string} exists', async function (category:string, profileId:string, templateId:string) {
    let profile;
    if (isDevice(category)) {
        profile = await getProfilesService().getDeviceProfile(templateId, profileId);
    } else if (isGroup(category)) {
        profile = await getProfilesService().getGroupProfile(templateId, profileId);
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
            await getProfilesService().createDeviceProfile(profile);
        } else if (isGroup(category)) {
            await getProfilesService().createGroupProfile(profile);
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete assetlibrary {word} profile {string} of {string}', async function (category:string, profileId:string, templateId:string) {
    try {
        if (isDevice(category)) {
            await getProfilesService().deleteDeviceProfile(templateId, profileId);
        } else if (isGroup(category)) {
            await getProfilesService().deleteGroupProfile(templateId, profileId);
        }
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('assetlibrary {word} profile {string} of {string} exists with attributes', async function (category:string, profileId:string, templateId:string, data:TableDefinition) {
    const d = data.rowsHash();

    let r:DeviceProfile10Resource|GroupProfile10Resource;
    if (isDevice(category)) {
        r = await getProfilesService().getDeviceProfile(templateId, profileId);
    } else if (isGroup(category)) {
        r = await getProfilesService().getGroupProfile(templateId, profileId);
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
