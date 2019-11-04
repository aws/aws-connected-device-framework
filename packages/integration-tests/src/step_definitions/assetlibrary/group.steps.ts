/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Given, setDefaultTimeout, When, TableDefinition, Then} from 'cucumber';
import { GroupsService, Group10Resource, GroupResourceList, DeviceResourceList } from '@cdf/assetlibrary-client/dist';
import { fail } from 'assert';
import stringify from 'json-stable-stringify';

import chai_string = require('chai-string');
import {expect, use} from 'chai';
import { RESPONSE_STATUS, AUTHORIZATION_TOKEN } from '../common/common.steps';
use(chai_string);

setDefaultTimeout(10 * 1000);

let groups: GroupsService;

function getGroupsService(world:any) {
    if (groups===undefined) {
        groups = new GroupsService();
    }
    groups.init({authToken: world[AUTHORIZATION_TOKEN]});
    return groups;
}


Given('group {string} does not exist', async function (groupPath:string) {
    try {
        await getGroupsService(this).getGroup(groupPath);
        fail('A 404 should be thrown');
    } catch (err) {
        expect(err.status).eq(404);
    }
});

Given('group {string} exists', async function (groupPath:string) {
    await getGroupsService(this).getGroup(groupPath);
});

async function createGroup (world:any, name:string, parentPath:string, data:TableDefinition, profileId?:string) {

    const d = data.rowsHash();

    if (parentPath===null || parentPath==='') {
        parentPath=undefined;
    }

    const group: Group10Resource = {
        parentPath,
        name,
        templateId: undefined
    };

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            group[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            group[key] = null;
        } else if (value==='___undefined___') {
            delete group[key];
        } else {
            group[key] = d[key];
        }
    });

    await getGroupsService(world).createGroup(group, profileId);
}

When('I create group {string} of {string} with attributes', async function (name:string, parentPath:string, data:TableDefinition) {
    try {
        await createGroup(this, name, parentPath, data);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create group {string} of {string} applying profile {string} with attributes', async function (name:string, parentPath:string, profileId:string, data:TableDefinition) {
    try {
        await createGroup(this, name, parentPath, data, profileId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I create group {string} of {string} with invalid attributes', async function (name:string, parentPath:string, data:TableDefinition) {
    try {
        await createGroup(this, name, parentPath, data);
        fail('Expected 400');
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
        expect(err.status).eq(400);
    }
});

When('I update group {string} with attributes', async function (groupPath:string, data:TableDefinition) {

    const d = data.rowsHash();

    const group: Group10Resource = {
        templateId: undefined
    };

    Object.keys(d).forEach( key => {
        const value = d[key];
        if (value.startsWith('{') || value.startsWith('[')) {
            group[key] = JSON.parse(d[key]);
        } else if (value==='___null___') {
            group[key] = null;
        } else if (value==='___undefined___') {
            delete group[key];
        } else {
            group[key] = d[key];
        }
    });

    try {
        await getGroupsService(this).updateGroup(groupPath, group);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I update group {string} applying profile {string}', async function (groupPath:string, profileId:string) {
    const group: Group10Resource = {
        groupPath,
        templateId: undefined
    };

    try {
        await getGroupsService(this).updateGroup(groupPath, group, profileId);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I delete group {string}', async function (groupPath:string) {
    try {
        await getGroupsService(this).deleteGroup(groupPath);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I get group {string}', async function (groupPath:string) {
    try {
        await getGroupsService(this).getGroup(groupPath);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I detatch group {string} from group {string} via {string}', async function (thisGroup:string, otherGroup:string, relation:string) {
    try {
        await getGroupsService(this).detachFromGroup(thisGroup, relation, otherGroup);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I attach group {string} to group {string} via {string}', async function (thisGroup:string, otherGroup:string, relation:string) {
    try {
        await getGroupsService(this).attachToGroup(thisGroup, relation, otherGroup);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('group {string} exists with attributes', async function (groupPath:string, data:TableDefinition) {

    const d = data.rowsHash();
    const r = await getGroupsService(this).getGroup(groupPath);

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

When('I retrieve {string} group members of {string}', async function (template:string, groupPath:string) {
    if (template==='') {
        template = undefined;
    }
    try {
        this['members'] = await getGroupsService(this).listGroupMembersGroups(groupPath, template);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

When('I retrieve {string} device members of {string}', async function (template:string, groupPath:string) {
    if (template==='') {
        template = undefined;
    }
    try {
        this['members'] = await getGroupsService(this).listGroupMembersDevices(groupPath, template);
    } catch (err) {
        this[RESPONSE_STATUS]=err.status;
    }
});

Then('group contains {int} getGroupsService()', async function (total:number) {
    expect((<GroupResourceList>this['members']).results.length).eq(total);
});

Then('group contains {int} devices', async function (total:number) {
    expect((<DeviceResourceList>this['members']).results.length).eq(total);
});

Then('group contains group {string}', async function (groupPath:string) {
    let found=false;
    (<GroupResourceList>this['members']).results.forEach(group=> {
        if (group.groupPath===groupPath) {
            // found, so can just return
            found=true;
        }
    });
    expect(found).eq(true);
});

Then('group contains device {string}', async function (deviceId:string) {
    let found=false;
    (<DeviceResourceList>this['members']).results.forEach(device=> {
        if (device.deviceId===deviceId) {
            // found, so can just return
            found=true;
        }
    });
    expect(found).eq(true);
});

Then('response should fail with {int}', async function (status:number) {
    expect(this[RESPONSE_STATUS]).eq(status);
});
