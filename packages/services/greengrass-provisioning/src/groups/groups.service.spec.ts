/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import AWS, { AWSError } from 'aws-sdk';

import { GroupsDao } from './groups.dao';
import { GroupsService } from './groups.service';
import { GroupItem, GroupItemList } from './groups.models';
import { TemplateItem } from '../templates/templates.models';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { GreengrassUtils } from '../utils/greengrass.util';
import { TemplatesDao } from '../templates/templates.dao';
describe('GroupsService', () => {
    const promisesConcurrency = 10;
    let mockedSubscriptionsService: jest.Mocked<SubscriptionsService>;
    let mockedTemplatesDao: jest.Mocked<TemplatesDao>;
    let mockedGroupsDao: jest.Mocked<GroupsDao>;
    let mockedGreengrassUtils: jest.Mocked<GreengrassUtils>;
    let mockedGreengrass: AWS.Greengrass;
    // let mockedIot: AWS.Iot;

    let instance: GroupsService;

    beforeEach(() => {
        mockedSubscriptionsService = createMockInstance(SubscriptionsService);
        mockedTemplatesDao = createMockInstance(TemplatesDao);
        mockedGroupsDao = createMockInstance(GroupsDao);
        mockedGreengrassUtils = createMockInstance(GreengrassUtils);
        const mockedGreengrassFactory = () => mockedGreengrass;
        mockedGreengrass = new AWS.Greengrass();
        // const mockedIotFactory = () => mockedIot;
        // mockedIot = new AWS.Iot;

        instance = new GroupsService(
            mockedSubscriptionsService, mockedTemplatesDao, mockedGroupsDao, promisesConcurrency, mockedGreengrassUtils, mockedGreengrassFactory);
    });
    it('createGroups: happy path', async(): Promise<void> => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
            },{
                name: 'name-2',
                templateName: 'template-1',
            }]
        };

        const template = stubTemplate1();

        // mock - get template
        mockedTemplatesDao.get = jest.fn().mockReturnValueOnce(template);

        // mock - get template gg version
        const mockGetGroupVersionResponse = stubGetGroupVersionResponse(template.groupId,template.groupVersionId, 1)
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn().mockReturnValueOnce(mockGetGroupVersionResponse);

        // mock - create groups
        const mockCreateGroupResponse1 = stubCreateGroupResponse1();
        const mockCreateGroupResponse2 = stubCreateGroupresponse2();
        const mockCreateGroup = mockedGreengrass.createGroup = jest.fn()
            .mockReturnValueOnce(mockCreateGroupResponse1)
            .mockReturnValueOnce(mockCreateGroupResponse2);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.createGroups(input);
        
        // verify everything was called the expected no. of times
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(1);
        expect(mockGetGroupVersion.mock.calls.length).toBe(1);
        expect(mockCreateGroup.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(1);
        expect(g1.versionId).toBe('group-id-1-v1');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe(template.name);
        expect(g1.templateVersionNo).toBe(template.versionNo);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBe('group-id-2');
        expect(g2.versionNo).toBe(1);
        expect(g2.versionId).toBe('group-id-2-v1');
        expect(g2.arn).toBe('group-arn-2');
        expect(g2.templateName).toBe(template.name);
        expect(g2.templateVersionNo).toBe(template.versionNo);
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g2.deployed).toBe(false);
        expect(g2.taskStatus).toBe('Success');

    });

    it('createGroups: unknown template', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
            },{
                name: 'name-2',
                templateName: 'unknown-template',
            }]
        };

        // mock - get templates
        const template1 = stubTemplate1();
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1)
            .mockRejectedValueOnce(undefined);  // return undefined as unknown template

        // mock - get template gg version
        const mockGetGroupVersionResponse = stubGetGroupVersionResponse(template1.groupId,template1.groupVersionId, 1)
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn().mockReturnValueOnce(mockGetGroupVersionResponse);

        // mock - create group 1 (no create for group 2)
        const mockCreateGroupResponse1 = stubCreateGroupResponse1();
        const mockCreateGroup = mockedGreengrass.createGroup = jest.fn()
            .mockReturnValueOnce(mockCreateGroupResponse1);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.createGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(2);
        expect(mockGetGroupVersion.mock.calls.length).toBe(1);
        expect(mockCreateGroup.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(1);
        expect(g1.versionId).toBe('group-id-1-v1');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe(template1.name);
        expect(g1.templateVersionNo).toBe(template1.versionNo);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBeUndefined();
        expect(g2.versionNo).toBeUndefined();
        expect(g2.versionId).toBeUndefined();
        expect(g2.arn).toBeUndefined();
        expect(g2.templateName).toBe('unknown-template');
        expect(g2.templateVersionNo).toBeUndefined();
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g2.taskStatus).toBe('Failure');
    });

    it('createGroups: unknown template greengrass group', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
            },{
                name: 'name-2',
                templateName: 'unknown-template-gg-group',
            }]
        };

        const template1 = stubTemplate1();
        const template2 = stubTemplate2();

        // mock - get templates
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1)
            .mockReturnValueOnce(template2);

        // mock - get template 1 gg version
        const mockGetGroupVersionResponse = stubGetGroupVersionResponse(template1.groupId,template1.groupVersionId, 1);
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn()
            .mockReturnValueOnce(mockGetGroupVersionResponse)
            .mockImplementationOnce(()=> {
                return {
                  promise: () : AWS.Greengrass.GetGroupVersionResponse => {
                      throw new Error();
                  }
                };
            });

        // mock - create group 1 (no create for group 2)
        const mockCreateGroupResponse1 = stubCreateGroupResponse1();
        const mockCreateGroup = mockedGreengrass.createGroup = jest.fn()
            .mockReturnValueOnce(mockCreateGroupResponse1);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn().mockResolvedValueOnce(undefined);

        // execute
        const actual = await instance.createGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(2);
        expect(mockGetGroupVersion.mock.calls.length).toBe(2);
        expect(mockCreateGroup.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(1);
        expect(g1.versionId).toBe('group-id-1-v1');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe(template1.name);
        expect(g1.templateVersionNo).toBe(template1.versionNo);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBeUndefined();
        expect(g2.versionNo).toBeUndefined();
        expect(g2.versionId).toBeUndefined();
        expect(g2.arn).toBeUndefined();
        expect(g2.templateName).toBe('unknown-template-gg-group');
        expect(g2.templateVersionNo).toBeUndefined();
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g2.taskStatus).toBe('Failure');
    });

    it('createGroups: duplicate name', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
            },{
                name: 'name-2',  // will already exist
                templateName: 'template-1',
            }]
        };

        // mock - get templates
        const template1 = stubTemplate1();
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1)
            .mockRejectedValueOnce(undefined);  // return undefined as unknown template

        // mock - get template gg version
        const mockGetGroupVersionResponse = stubGetGroupVersionResponse(template1.groupId,template1.groupVersionId, 1)
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn().mockReturnValueOnce(mockGetGroupVersionResponse);

        // mock get groups (name-2 already exists whereas name-1 does not)
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(undefined)
            .mockReturnValueOnce({
                name: 'name21'
            });

        // mock - create group 1 (no create for group 2)
        const mockCreateGroupResponse1 = stubCreateGroupResponse1();
        const mockCreateGroup = mockedGreengrass.createGroup = jest.fn()
            .mockReturnValueOnce(mockCreateGroupResponse1);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.createGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(1);
        expect(mockGetGroupVersion.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockCreateGroup.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(1);
        expect(g1.versionId).toBe('group-id-1-v1');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe(template1.name);
        expect(g1.templateVersionNo).toBe(template1.versionNo);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBeUndefined();
        expect(g2.versionNo).toBeUndefined();
        expect(g2.versionId).toBeUndefined();
        expect(g2.arn).toBeUndefined();
        expect(g2.templateName).toBe(template1.name);
        expect(g1.templateVersionNo).toBe(template1.versionNo);
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g2.taskStatus).toBe('Failure');
        expect(g2.statusMessage).toBe('Greengrass group name already in use.');
    });

    it('updateGroups: happy path', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1'
            },{
                name: 'name-2',
            }]
        };

        const group1:GroupItem = stubGroupItem1()
        const group2:GroupItem = stubGroupItem2()

        const template1_v1 = stubTemplate1();
        const template1_v2 = stubTemplate1();
        template1_v2.versionNo= 2;
        template1_v2.groupVersionId = 'template-group-id-1-v2';

        const template2_v1 = stubTemplate2();
        const template2_v2 = stubTemplate2();
        template2_v2.versionNo= 2;
        template2_v2.groupVersionId = 'template-group-id-2-v2';

        // mock - get group items
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1)
            .mockReturnValueOnce(group2);

        // mock - get templates for both templates (first 2 calls as we are not provided template version nos in the initial request, then last 4 as part of retrieving gg version info for both existing and updated templates)
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1_v2)
            .mockReturnValueOnce(template2_v2)
            .mockReturnValueOnce(template1_v1)
            .mockReturnValueOnce(template2_v1)
            .mockReturnValueOnce(template1_v2)
            .mockReturnValueOnce(template2_v2);

        // mock - get gg group's for both
        const mockGetGgGroupResponse1 = stubGetGroupResponse1();
        const mockGetGgGroupResponse2 = stubGetGroupResponse2();
        const mockGetGgGroup = mockedGreengrass.getGroup = jest.fn()
            .mockReturnValueOnce(mockGetGgGroupResponse1)
            .mockReturnValueOnce(mockGetGgGroupResponse2);

        // mock - get gg version's for both groups, followed by gg versions of both templates
        const mockGetGroupVersionResponse1 = stubGetGroupVersionResponse('group-id-1','group-id-1-v1',1);
        const mockGetGroupVersionResponse2 = stubGetGroupVersionResponse('group-id-2','group-id-2-v1',2);
        const mockGetGroupVersionResponse3 = stubGetGroupVersionResponse(template1_v1.groupId,template1_v1.groupVersionId,3);
        const mockGetGroupVersionResponse4 =  stubGetGroupVersionResponse(template2_v1.groupId,template2_v1.groupVersionId,4);
        const mockGetGroupVersionResponse5 = stubGetGroupVersionResponse(template1_v2.groupId,template1_v2.groupVersionId,5);
        const mockGetGroupVersionResponse6 =  stubGetGroupVersionResponse(template2_v2.groupId,template2_v2.groupVersionId,6);
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn()
            .mockReturnValueOnce(mockGetGroupVersionResponse1)
            .mockReturnValueOnce(mockGetGroupVersionResponse2)
            .mockReturnValueOnce(mockGetGroupVersionResponse3)
            .mockReturnValueOnce(mockGetGroupVersionResponse4)
            .mockReturnValueOnce(mockGetGroupVersionResponse5)
            .mockReturnValueOnce(mockGetGroupVersionResponse6);

        // mock - update groups
        const mockCreateGroupVersionResponse1 = stubCreateGroupVersionResponse1();
        const mockCreateGroupVersionResponse2 = stubCreateGroupVersionResponse2();
        const mockCreateGroupVersion = mockedGreengrass.createGroupVersion = jest.fn()
            .mockReturnValueOnce(mockCreateGroupVersionResponse1)
            .mockReturnValueOnce(mockCreateGroupVersionResponse2);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.updateGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedGroupsDao.get.mock.calls.length).toBe(2);
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(6);
        expect(mockGetGgGroup.mock.calls.length).toBe(2);
        expect(mockGetGroupVersion.mock.calls.length).toBe(6);
        expect(mockCreateGroupVersion.mock.calls.length).toBe(2);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(2);
        expect(g1.versionId).toBe('group-id-1-v2');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe('template-1');
        expect(g1.templateVersionNo).toBe(2);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBe('group-id-2');
        expect(g2.versionNo).toBe(2);
        expect(g2.versionId).toBe('group-id-2-v2');
        expect(g2.arn).toBe('group-arn-2');
        expect(g2.templateName).toBe('template-2');
        expect(g2.templateVersionNo).toBe(2);
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g2.deployed).toBe(false);
        expect(g2.taskStatus).toBe('Success');

    });

    it('updateGroups: expand function env vars', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
                templateVersionNo: 2
            }]
        };

        const group1:GroupItem = stubGroupItem1()

        const template1_v1 = stubTemplate1();
        const template1_v2 = stubTemplate1();
        template1_v2.versionNo= 2;
        template1_v2.groupVersionId = 'template-group-id-1-v2';

        // mock - get group items
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(group1);

        // mock - get templates for both template version
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1_v1)
            .mockReturnValueOnce(template1_v2);

        // mock - get gg group's for both
        const mockGetGgGroupResponse1 = stubGetGroupResponse1();
        const mockGetGgGroup = mockedGreengrass.getGroup = jest.fn()
            .mockReturnValueOnce(mockGetGgGroupResponse1);

        // mock - get gg version's for both groups, followed by gg versions of both templates
        const mockGetGroupVersionResponse1 = stubGetGroupVersionResponse('group-id-1','group-id-1-v1',1);
        const mockGetGroupVersionResponse2 = stubGetGroupVersionResponse(template1_v1.groupId,template1_v1.groupVersionId,2);
        const mockGetGroupVersionResponse3 = stubGetGroupVersionResponse(template1_v2.groupId,template1_v2.groupVersionId,3);
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn()
            .mockReturnValueOnce(mockGetGroupVersionResponse1)
            .mockReturnValueOnce(mockGetGroupVersionResponse2)
            .mockReturnValueOnce(mockGetGroupVersionResponse3);

        // mock the env var processing
        mockedGreengrassUtils.processFunctionEnvVarTokens = jest.fn()
            .mockReturnValueOnce('updated-function-version-arn');

        // mock - update groups
        const mockCreateGroupVersionResponse1 = stubCreateGroupVersionResponse1();
        const mockCreateGroupVersion = mockedGreengrass.createGroupVersion = jest.fn()
            .mockReturnValueOnce(mockCreateGroupVersionResponse1);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.updateGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedGroupsDao.get.mock.calls.length).toBe(1);
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(2);
        expect(mockGetGgGroup.mock.calls.length).toBe(1);
        expect(mockGetGroupVersion.mock.calls.length).toBe(3);
        expect(mockedGreengrassUtils.processFunctionEnvVarTokens.mock.calls.length).toBe(1);
        expect(mockCreateGroupVersion.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(2);
        expect(g1.versionId).toBe('group-id-1-v2');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe('template-1');
        expect(g1.templateVersionNo).toBe(2);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

    });

    it('updateGroups: process updated subscriptions', async() => {

        // stubs
        const input:GroupItemList = {
            groups:[{
                name: 'name-1',
                templateName: 'template-1',
                templateVersionNo: 2
            }]
        };

        const existingGroup1:GroupItem = stubGroupItem1()

        const template1_v1 = stubTemplate1();
        template1_v1.subscriptions = {
            '__all': [{
                    id: '${thingName}_${thingType}_1',  // should be determined to be a deletion
                    source: '${thingArn}',
                    target: 'cloud',
                    subject: 'dt/a'
                }
            ],
            type2:[{
                    id: '${thingName}_${thingType}_2',  // should be determined to be an update
                    source: '${thingArn}',
                    target: 'cloud',
                    subject: 'dt/b'
                }
            ]
        }
        const template1_v2 = stubTemplate1();
        template1_v2.versionNo= 2;
        template1_v2.groupVersionId = 'template-group-id-1-v2';
        template1_v2.subscriptions = {
            type2: [{
                    id: '${thingName}_${thingType}_2',  // should be determined to be an update
                    source: '${thingArn}',
                    target: 'cloud',
                    subject: 'dt/this_has_changed'
                }
            ],
            '__all':[{
                    id: '${thingName}_${thingType}_3',  // should be determined to be an addition
                    source: '${thingArn}',
                    target: 'cloud',
                    subject: 'dt/c'
                }
            ]
        }

        // mock - get group items
        mockedGroupsDao.get = jest.fn()
            .mockReturnValueOnce(existingGroup1)

        // mock - get templates for both templates (first 2 calls as we are not provided template version nos in the initial request, then last 4 as part of retrieving gg version info for both existing and updated templates)
        mockedTemplatesDao.get = jest.fn()
            .mockReturnValueOnce(template1_v2)
            .mockReturnValueOnce(template1_v1)
            .mockReturnValueOnce(template1_v2);

        // mock - get gg group's for both
        const mockGetGgGroupResponse1 = stubGetGroupResponse1();
        const mockGetGgGroup = mockedGreengrass.getGroup = jest.fn()
            .mockReturnValueOnce(mockGetGgGroupResponse1);

        // mock - get gg version's for the group, followed by gg versions of both template versions
        const mockGetGroupVersionResponse1 = stubGetGroupVersionResponse('group-id-1','group-id-1-v1',1);
        const mockGetGroupVersionResponse2 = stubGetGroupVersionResponse(template1_v1.groupId,template1_v1.groupVersionId,2);
        const mockGetGroupVersionResponse3 = stubGetGroupVersionResponse(template1_v2.groupId,template1_v2.groupVersionId,3);
        mockGetGroupVersionResponse3.response.Definition.SubscriptionDefinitionVersionArn = 'rn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/21111111-1111-1111-1111-111111111123/versions/11111111-1111-1111-1111-111111111125';
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn()
            .mockReturnValueOnce(mockGetGroupVersionResponse1)
            .mockReturnValueOnce(mockGetGroupVersionResponse2)
            .mockReturnValueOnce(mockGetGroupVersionResponse3);

        // mock get device definition version info
        const mockGetDeviceInfoResponse : AWS.Greengrass.DeviceDefinitionVersion = {
            Devices: [{
                Id: 'thing1',
                ThingArn: 'arn:aws:iot:us-west-2:123456789012:thing/thing1',
                CertificateArn: 'arn:aws:iot:us-west-2:123456789012:cert/66a415ec415668c2349a76170b64ac0878231c1e21ec83c10e92a18bd568eb92'
            },{
                Id: 'thing2',
                ThingArn: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                CertificateArn: 'arn:aws:iot:us-west-2:123456789012:cert/66a415ec415668c2349a76170b64ac0878231c1e21ec83c10e92a18bd568eb93'
            }]
        };
        const mockGetDeviceInfoSpy = mockedGreengrassUtils.getDeviceInfo = jest.fn().mockReturnValueOnce(mockGetDeviceInfoResponse);

        // mock get core definition version info
        const mockGetCoreInfoResponse :AWS.Greengrass.CoreDefinitionVersion = {
            Cores: [{
                Id: 'core1',
                ThingArn: 'arn:aws:iot:us-west-2:123456789012:thing/core1',
                CertificateArn: 'arn:aws:iot:us-west-2:123456789012:cert/66a415ec415668c2349a76170b64ac0878231c1e21ec83c10e92a18bd568eb94'

            }]
        };
        const mockGetCoreInfoSpy = mockedGreengrassUtils.getCoreInfo = jest.fn().mockReturnValueOnce(mockGetCoreInfoResponse);

        // mock get subscription definition version info
        const mockExistingGgGetSubscriptionInfoResponse:AWS.Greengrass.SubscriptionDefinitionVersion = {
                Subscriptions: [{
                    Id: 'template_1', 
                    Source: 'lambda1',
                    Target: 'cloud',
                    Subject: 'dt/a'
                },{
                    Id: 'template_2', 
                    Source: 'lambda2',
                    Target: 'cloud',
                    Subject: 'dt/b'
                },{
                    Id: 'thing1_type1_1', 
                    Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing1',
                    Target: 'cloud',
                    Subject: 'dt/a'
                },{
                    Id: 'thing2_type2_1', 
                    Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                    Target: 'cloud',
                    Subject: 'dt/a'
                },{
                    Id: 'core1_type3_1', 
                    Source: 'arn:aws:iot:us-west-2:123456789012:thing/core1',
                    Target: 'cloud',
                    Subject: 'dt/a'
                },{
                    Id: 'thing2_type2_2', 
                    Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                    Target: 'cloud',
                    Subject: 'dt/b'
                }]
        };
        const mockExistingTemplateGetSubscriptionInfoResponse:AWS.Greengrass.SubscriptionDefinitionVersion = {
                Subscriptions: [{
                    Id: 'template_1', 
                    Source: 'lambda1',
                    Target: 'cloud',
                    Subject: 'dt/a'
                },{
                    Id: 'template_2', 
                    Source: 'lambda2',
                    Target: 'cloud',
                    Subject: 'dt/b'
                }]
        };
        const mockUpdatedTemplateGetSubscriptionInfoResponse:AWS.Greengrass.SubscriptionDefinitionVersion = {
                Subscriptions: [{
                    Id: 'template_2', 
                    Source: 'lambda2',
                    Target: 'cloud',
                    Subject: 'dt/b_changed'
                },{
                    Id: 'template_3', 
                    Source: 'lambda3',
                    Target: 'cloud',
                    Subject: 'dt/c'
                }]
        };
        const mockGetSubscriptionInfoSpy = mockedGreengrassUtils.getSubscriptionInfo = jest.fn()
            .mockReturnValueOnce(mockExistingGgGetSubscriptionInfoResponse)
            .mockReturnValueOnce(mockExistingTemplateGetSubscriptionInfoResponse)
            .mockReturnValueOnce(mockUpdatedTemplateGetSubscriptionInfoResponse);

        // mock get things
        const mockGetThingsSpy = mockedGreengrassUtils.getThings = jest.fn()
            .mockReturnValueOnce({
                core1: {
                    thingName: 'core1',
                    thingArn: 'arn:aws:iot:us-west-2:123456789012:thing/core1',
                    thingTypeName: 'type3'
                }
            })
            .mockReturnValueOnce({
                thing1: {
                    thingName: 'thing1',
                    thingArn: 'arn:aws:iot:us-west-2:123456789012:thing/thing1',
                    thingTypeName: 'type1'
                },
                thing2: {
                    thingName: 'thing2',
                    thingArn: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                    thingTypeName: 'type2'
                }
            })

        // mock subscription expansion
        mockedSubscriptionsService.expandSubscriptionTemplate = jest.fn()
            // to remove, _all
            .mockReturnValueOnce({id: 'thing1_type1_1', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing1', target: 'cloud', subject: 'dt/a' })
            .mockReturnValueOnce({id: 'thing2_type2_1', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2', target: 'cloud', subject: 'dt/a' })
            .mockReturnValueOnce({id: 'core1_type3_1', source: 'arn:aws:iot:us-west-2:123456789012:thing/core1', target: 'cloud', subject: 'dt/a' })
            // to remove, type2
            .mockReturnValueOnce({id: 'thing2_type2_2', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2', target: 'cloud', subject: 'dt/b' })
            // to add, type2
            .mockReturnValueOnce({id: 'thing2_type2_2', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2', target: 'cloud', subject: 'dt/this_has_changed' })
            // to add, _all
            .mockReturnValueOnce({id: 'thing1_type1_3', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing1', target: 'cloud', subject: 'dt/c' })
            .mockReturnValueOnce({id: 'thing2_type2_3', source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2', target: 'cloud', subject: 'dt/c' })
            .mockReturnValueOnce({id: 'core1_type3_3', source: 'arn:aws:iot:us-west-2:123456789012:thing/core1', target: 'cloud', subject: 'dt/c' })

        // mock - create subscription
        const mockCreateSubscriptionDefinitionVersionResponse = '11111111-1111-1111-2111-111111111123';
        const mockCreateSubscriptionDefinitionVersionSpy = mockedGreengrassUtils.createSubscriptionDefinitionVersion = jest.fn()
            .mockReturnValueOnce(mockCreateSubscriptionDefinitionVersionResponse);

        // mock - update group
        const mockCreateGroupVersionResponse1 = stubCreateGroupVersionResponse1();
        const mockCreateGroupVersion = mockedGreengrass.createGroupVersion = jest.fn()
            .mockReturnValueOnce(mockCreateGroupVersionResponse1);

        // mock - save
        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.updateGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedGroupsDao.get.mock.calls.length).toBe(1);
        expect(mockedTemplatesDao.get.mock.calls.length).toBe(2);
        expect(mockGetGgGroup.mock.calls.length).toBe(1);
        expect(mockGetGroupVersion.mock.calls.length).toBe(3);
        expect(mockGetGgGroup.mock.calls.length).toBe(1);
        expect(mockGetSubscriptionInfoSpy.mock.calls.length).toBe(3);
        expect(mockGetDeviceInfoSpy.mock.calls.length).toBe(1);
        expect(mockGetCoreInfoSpy.mock.calls.length).toBe(1);
        expect(mockGetThingsSpy.mock.calls.length).toBe(2);
        expect(mockedSubscriptionsService.expandSubscriptionTemplate.mock.calls.length).toBe(8);
        expect(mockCreateSubscriptionDefinitionVersionSpy.mock.calls.length).toBe(1);
        expect(mockCreateSubscriptionDefinitionVersionSpy.mock.calls[0][0]).toEqual('arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/11111111-1111-1111-1111-111111111123/versions/11111111-1111-1111-1111-111111111124');
        const expectedArg1:AWS.Greengrass.SubscriptionDefinitionVersion = {
            Subscriptions: [{
                Id: 'thing2_type2_2', 
                Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                Target: 'cloud',
                Subject: 'dt/this_has_changed'
            },{
                Id: 'thing1_type1_3', 
                Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing1',
                Target: 'cloud',
                Subject: 'dt/c'
            },{
                Id: 'thing2_type2_3', 
                Source: 'arn:aws:iot:us-west-2:123456789012:thing/thing2',
                Target: 'cloud',
                Subject: 'dt/c'
            },{
                Id: 'core1_type3_3', 
                Source: 'arn:aws:iot:us-west-2:123456789012:thing/core1',
                Target: 'cloud',
                Subject: 'dt/c'
            },{
                Id: 'template_2', 
                Source: 'lambda2',
                Target: 'cloud',
                Subject: 'dt/b_changed'
            },{
                Id: 'template_3', 
                Source: 'lambda3',
                Target: 'cloud',
                Subject: 'dt/c'
            }]
        };
        expect(mockCreateSubscriptionDefinitionVersionSpy.mock.calls[0][1]).toEqual(expectedArg1);
        expect(mockCreateGroupVersion.mock.calls.length).toBe(1);
        expect(mockedGroupsDao.saveGroups.mock.calls.length).toBe(1);

        // verify the response
        expect(actual).toBeDefined();
        expect(actual.groups.length).toBe(input.groups.length);

        const g1 = actual.groups[0];
        expect(g1.name).toBe('name-1');
        expect(g1.id).toBe('group-id-1');
        expect(g1.versionNo).toBe(2);
        expect(g1.versionId).toBe('group-id-1-v2');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe('template-1');
        expect(g1.templateVersionNo).toBe(2);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);
        expect(g1.taskStatus).toBe('Success');

    });

});

class MockAWSPromise<T> {
    public response: T;
    public error: AWSError = null;

    promise(): Promise<T> {
        return new Promise((resolve, reject) => {
            if (this.error !== null) {
                return reject(this.error);
            } else {
                return resolve(this.response);
            }
        });
    }
}

function stubGroupItem1(): GroupItem {
    return {
        name: 'name-1',
        id: 'group-id-1',
        versionId: 'group-id-1-v1',
        arn: 'group-arn-1',
        versionNo: 1,
        templateName: 'template-1',
        templateVersionNo: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function stubGroupItem2(): GroupItem {
    return {
        name: 'name-2',
        id: 'group-id-2',
        versionId: 'group-id-2-v1',
        arn: 'group-arn-2',
        versionNo: 1,
        templateName: 'template-2',
        templateVersionNo: 1,
        createdAt: new Date(),
        updatedAt: new Date()
    };
}

function stubCreateGroupVersionResponse2() {
    const mock = new MockAWSPromise<AWS.Greengrass.CreateGroupVersionResponse>();
    mock.response = {
        Id: 'group-id-2',
        Arn: 'group-arn-2',
        Version: 'group-id-2-v2'
    };
    return mock;
}

function stubCreateGroupVersionResponse1() {
    const mock = new MockAWSPromise<AWS.Greengrass.CreateGroupVersionResponse>();
    mock.response = {
        Id: 'group-id-1',
        Arn: 'group-arn-1',
        Version: 'group-id-1-v2'
    };
    return mock;
}

function stubGetGroupResponse2(): MockAWSPromise<AWS.Greengrass.GetGroupResponse> {
    const mock = new MockAWSPromise<AWS.Greengrass.GetGroupResponse>();
    mock.response = {
        Id: 'group-id-2',
        Arn: 'group-arn-2',
        LatestVersion: 'group-id-2-v1',
        Name: 'name-2'
    };
    return mock;
}

function stubGetGroupResponse1(): MockAWSPromise<AWS.Greengrass.GetGroupResponse> {
    const mock = new MockAWSPromise<AWS.Greengrass.GetGroupResponse>();
    mock.response = {
        Id: 'group-id-1',
        Arn: 'group-arn-1',
        LatestVersion: 'group-id-1-v1',
        Name: 'name-1'
    };
    return mock;
}

function stubCreateGroupresponse2() {
    const mockCreateGroupResponse2 = new MockAWSPromise<AWS.Greengrass.CreateGroupResponse>();
    mockCreateGroupResponse2.response = {
        Id: 'group-id-2',
        Arn: 'group-arn-2',
        LatestVersion: 'group-id-2-v1'
    };
    return mockCreateGroupResponse2;
}

function stubCreateGroupResponse1() {
    const mockCreateGroupResponse1 = new MockAWSPromise<AWS.Greengrass.CreateGroupResponse>();
    mockCreateGroupResponse1.response = {
        Id: 'group-id-1',
        Arn: 'group-arn-1',
        LatestVersion: 'group-id-1-v1'
    };
    return mockCreateGroupResponse1;
}

function stubGetGroupVersionResponse(id:string, version:string, abitraryId:number) {
    const mockGetGroupVersionResponse = new MockAWSPromise<AWS.Greengrass.GetGroupVersionResponse>();
    mockGetGroupVersionResponse.response = {
        Id: id,
        Version: version,
        Definition: {
            ConnectorDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/connectors/${abitraryId}1111111-1111-1111-1111-111111111111/versions/11111111-1111-1111-1111-111111111112`,
            CoreDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/cores/${abitraryId}1111111-1111-1111-1111-111111111113/versions/11111111-1111-1111-1111-111111111114`,
            DeviceDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/devices/${abitraryId}1111111-1111-1111-1111-111111111115/versions/11111111-1111-1111-1111-111111111116`,
            FunctionDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/functions/${abitraryId}1111111-1111-1111-1111-111111111117/versions/11111111-1111-1111-1111-111111111118`,
            LoggerDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/loggers/${abitraryId}1111111-1111-1111-1111-111111111119/versions/11111111-1111-1111-1111-111111111120`,
            ResourceDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/resources/${abitraryId}1111111-1111-1111-1111-111111111121/versions/11111111-1111-1111-1111-111111111122`,
            SubscriptionDefinitionVersionArn: `arn:aws:greengrass:us-west-2:123456789012:/greengrass/definition/subscriptions/${abitraryId}1111111-1111-1111-1111-111111111123/versions/11111111-1111-1111-1111-111111111124`
        }
    };
    return mockGetGroupVersionResponse;
}

function stubTemplate1(): TemplateItem {
    return {
        name: 'template-1',
        versionNo: 1,
        groupId: 'template-group-id-1',
        groupVersionId: 'template-group-id-1-v1',
        enabled: true
    };
}

function stubTemplate2(): TemplateItem {
    return {
        name: 'template-2',
        versionNo: 1,
        groupId: 'template-group-id-2',
        groupVersionId: 'template-group-id-2-v1',
        enabled: true
    };
}

