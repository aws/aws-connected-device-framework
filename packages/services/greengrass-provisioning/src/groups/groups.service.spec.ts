/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';
import AWS, { AWSError } from 'aws-sdk';

import { GroupsDao } from './groups.dao';
import { TemplatesService } from '../templates/templates.service';
import { GroupsService } from './groups.service';
import { GroupItemList } from './groups.models';
import { TemplateItem } from '../templates/templates.models';

describe('GroupsService', () => {
    let mockedTemplatesService: jest.Mocked<TemplatesService>;
    let mockedGroupsDao: jest.Mocked<GroupsDao>;
    let mockedGreengrass: AWS.Greengrass;

    let instance: GroupsService;

    beforeEach(() => {
        mockedTemplatesService = createMockInstance(TemplatesService);
        mockedGroupsDao = createMockInstance(GroupsDao);
        mockedGreengrass = new AWS.Greengrass();

        const mockedGreengrassFactory = () => {
            return mockedGreengrass;
        };

        instance = new GroupsService(mockedTemplatesService, mockedGroupsDao, mockedGreengrassFactory);
    });

    it('createGroups: happy path', async() => {

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

        const template:TemplateItem = {
            name: 'template-1',
            versionNo: 1,
            groupId: 'template-group-id-1',
            groupVersionId: 'template-group-version-id-1',
            enabled: true
        };

        // mocks
        mockedTemplatesService.get = jest.fn().mockReturnValueOnce(template);

        const mockGetGroupVersionResponse = new MockAWSPromise<AWS.Greengrass.GetGroupVersionResponse>();
        mockGetGroupVersionResponse.response = {
            Id: template.groupId,
            Version: template.groupVersionId,
            Definition: {
                ConnectorDefinitionVersionArn: 'connector-def-arn',
                CoreDefinitionVersionArn: 'core-def-arn',
                DeviceDefinitionVersionArn: 'device-def-arn',
                FunctionDefinitionVersionArn: 'function-def-arn',
                LoggerDefinitionVersionArn: 'logger-def-arn',
                ResourceDefinitionVersionArn: 'resource-def-arn',
                SubscriptionDefinitionVersionArn: 'subscription-def-arn'
            }
        };
        const mockGetGroupVersion = mockedGreengrass.getGroupVersion = jest.fn().mockReturnValueOnce(mockGetGroupVersionResponse);

        const mockCreateGroupResponse1 = new MockAWSPromise<AWS.Greengrass.CreateGroupResponse>();
        mockCreateGroupResponse1.response = {
            Id: 'group-id-1',
            Arn: 'group-arn-1',
            LatestVersion: 'group-version-id-1'
        };
        const mockCreateGroupResponse2 = new MockAWSPromise<AWS.Greengrass.CreateGroupResponse>();
        mockCreateGroupResponse2.response = {
            Id: 'group-id-2',
            Arn: 'group-arn-2',
            LatestVersion: 'group-version-id-2'
        };
        const mockCreateGroup = mockedGreengrass.createGroup = jest.fn()
            .mockReturnValueOnce(mockCreateGroupResponse1)
            .mockReturnValueOnce(mockCreateGroupResponse2);

        mockedGroupsDao.saveGroups = jest.fn();

        // execute
        const actual = await instance.createGroups(input);

        // verify everything was called the expected no. of times
        expect(mockedTemplatesService.get.mock.calls.length).toBe(1);
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
        expect(g1.versionId).toBe('group-version-id-1');
        expect(g1.arn).toBe('group-arn-1');
        expect(g1.templateName).toBe(template.name);
        expect(g1.templateVersionNo).toBe(template.versionNo);
        expect(g1.createdAt).toBeDefined();
        expect(g1.updatedAt).toBeDefined();
        expect(g1.deployed).toBe(false);

        const g2 = actual.groups[1];
        expect(g2.name).toBe('name-2');
        expect(g2.id).toBe('group-id-2');
        expect(g2.versionNo).toBe(1);
        expect(g2.versionId).toBe('group-version-id-2');
        expect(g2.arn).toBe('group-arn-2');
        expect(g2.templateName).toBe(template.name);
        expect(g2.templateVersionNo).toBe(template.versionNo);
        expect(g2.createdAt).toBeDefined();
        expect(g2.updatedAt).toBeDefined();
        expect(g2.deployed).toBe(false);

    });

    it('createGroups: unknown template', async() => {

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

        // mocks
        mockedTemplatesService.get = jest.fn().mockReturnValueOnce(undefined);

        // execute
        try {
            await instance.createGroups(input);
            fail('TEMPLATE_NOT_FOUND error should be thrown');
        } catch (err) {
            expect(err.message).toBe('TEMPLATE_NOT_FOUND');
        }

    });

    it('createGroups: unknown greengrass group', async() => {

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

        const template:TemplateItem = {
            name: 'template-1',
            versionNo: 1,
            groupId: 'template-group-id-1',
            groupVersionId: 'template-group-version-id-1',
            enabled: true
        };

        // mocks
        mockedTemplatesService.get = jest.fn().mockReturnValueOnce(template);

        const mockGetGroupVersionResponse = new MockAWSPromise<AWS.Greengrass.GetGroupVersionResponse>();
        mockGetGroupVersionResponse.response = undefined;
        mockedGreengrass.getGroupVersion = jest.fn().mockReturnValueOnce(mockGetGroupVersionResponse);

        // execute
        try {
            await instance.createGroups(input);
            fail('TEMPLATE_GROUP_VERSION_NOT_FOUND error should be thrown');
        } catch (err) {
            expect(err.message).toBe('TEMPLATE_GROUP_VERSION_NOT_FOUND');
        }

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
