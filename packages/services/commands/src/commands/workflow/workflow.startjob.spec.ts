/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { TemplatesService } from '../../templates/templates.service';
import { DevicesService, GroupsService, SearchService, SearchRequestModel, SearchResultsModel } from '@cdf/assetlibrary-client';
import { ThingsService } from '@cdf/provisioning-client';
import { StartJobAction, TargetType } from './workflow.startjob';

import AWS from 'aws-sdk';
import { CommandsDao } from '../commands.dao';
import { mock } from 'jest-mock-extended';

let mockedTemplatesService: jest.Mocked<TemplatesService>;
let mockedCommandsDao: jest.Mocked<CommandsDao>;
let mockedAssetLibraryDevicesService: jest.Mocked<DevicesService>;
let mockedAssetLibraryGroupsService: jest.Mocked<GroupsService>;
let mockedAssetLibrarySearchService: jest.Mocked<SearchService>;
let mockedProvisioningThingsService: jest.Mocked<ThingsService>;
let instance: StartJobAction;
let mockedIot: AWS.Iot;
let mockedS3: AWS.S3;

describe('StartJobAction', () => {

    beforeEach(() => {
        mockedTemplatesService = createMockInstance(TemplatesService);
        mockedCommandsDao = createMockInstance(CommandsDao);
        mockedAssetLibraryDevicesService = mock<DevicesService>();
        mockedAssetLibraryGroupsService = mock<GroupsService>();
        mockedAssetLibrarySearchService = mock<SearchService>();
        mockedProvisioningThingsService = mock<ThingsService>();
        mockedS3 = new AWS.S3();
        mockedIot = new AWS.Iot();

        const mockedS3Factory = () => {
            return mockedS3;
        };
        const mockedIotFactory = () => {
            return mockedIot;
        };

        const s3Bucket='';
        const s3Prefix='';
        const s3RoleArn='';
        const maxTargets=128;

        instance = new StartJobAction(mockedTemplatesService, mockedCommandsDao, mockedAssetLibraryDevicesService,
            mockedAssetLibraryGroupsService, mockedAssetLibrarySearchService, mockedProvisioningThingsService, s3Bucket, s3Prefix, s3RoleArn, maxTargets,
            mockedS3Factory, mockedIotFactory);
    });

    it('should build target list - 2 things returns 2 things as final targets', async () => {

        const commandId = 'cmd-001';
        const targets = ['arn:aws:iot:us-east-1:123456789012:thing/thing1',
            'arn:aws:iot:us-east-1:123456789012:thing/thing2'
        ];
        const expected = targets;

        // no mocks to set up

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, undefined);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - 130 things returns 1 ephemeral group as final target', async () => {

        const commandId = 'cmd-002';
        const targets:string[]=[];
        for(let x=0; x<130; x++) {
            targets.push(`arn:aws:iot:us-east-1:123456789012:thing/thing${x}`);
        }
        const expected = [`arn:aws:iot:us-east-1:123456789012:thinggroup/ephemeral-${commandId}`];

        mockedIot.createThingGroup = jest.fn().mockImplementationOnce(()=> {
            return {
              promise: () =>  {
                  return {
                    thingGroupArn: `arn:aws:iot:us-east-1:123456789012:thinggroup/ephemeral-${commandId}`
                };
              }
            };
        });

        mockedProvisioningThingsService.bulkProvisionThings = jest.fn().mockImplementationOnce(()=> ({taskId:'123'}) );

        mockedProvisioningThingsService.getBulkProvisionTask = jest.fn().mockImplementationOnce(()=> ({taskId:'123', status:'InProgress'}));
        mockedProvisioningThingsService.getBulkProvisionTask = jest.fn().mockImplementationOnce(()=> ({taskId:'123', status:'Completed'}));

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, undefined);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - 2 thing groups returns 2 thing groups as final targets', async () => {

        const commandId = 'cmd-003';
        const targets = ['arn:aws:iot:us-east-1:123456789012:thinggroup/group1',
            'arn:aws:iot:us-east-1:123456789012:thinggroup/group2'
        ];
        const expected = targets;

        // no mocks to set up

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, undefined);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - 130 thing groups returns error', async () => {

        const commandId = 'cmd-004';
        const targets:string[]=[];
        for(let x=0; x<130; x++) {
            targets.push(`arn:aws:iot:us-east-1:123456789012:thinggroup/group${x}`);
        }

        // no mocks to set up

        // execute and verify that it throws error
        async function callWrapper() {
            await instance.___testonly___buildTargetList(commandId, targets, undefined);
        }
        await expect(callWrapper()).rejects.toThrowError('MAX_GROUPS_EXCEEDED');

    }, 15000);

    it('should build target list - 2 cdf devices returns 2 things as final targets', async () => {

        const commandId = 'cmd-005';
        const targets = ['device001', 'device002'
        ];

        const expected = ['arn:aws:iot:us-east-1:123456789012:thing/device001',
            'arn:aws:iot:us-east-1:123456789012:thing/device002'
        ];

        // set up mocks
        mockedAssetLibraryDevicesService.getDevicesByID = jest.fn().mockImplementationOnce(()=> {
            return {results:[{awsIotThingArn:expected[0]},{awsIotThingArn:expected[1]}]};
        });

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, undefined);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - 2 cdf groups with 2 devices each returns 4 things as final targets', async () => {

        const commandId = 'cmd-005';
        const targets = ['/parent/group1', '/parent/group2'
        ];

        const expected = ['arn:aws:iot:us-east-1:123456789012:thing/device001',
            'arn:aws:iot:us-east-1:123456789012:thing/device002',
            'arn:aws:iot:us-east-1:123456789012:thing/device003',
            'arn:aws:iot:us-east-1:123456789012:thing/device004'
        ];

        // set up mocks
        mockedAssetLibraryGroupsService.listGroupMembersDevices =
            jest.fn().mockImplementationOnce(()=> ({results:[{awsIotThingArn:expected[0]},{awsIotThingArn:expected[1]}]}))
            .mockImplementationOnce(()=> ({results:[{awsIotThingArn:expected[2]},{awsIotThingArn:expected[3]}]}));

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, undefined);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - a target query returning 1 device, plus target of 2 cdf groups with 2 devices each returns 5 things as final targets', async () => {

        const commandId = 'cmd-005';
        const targets = ['/parent/group1', '/parent/group2'
        ];
        const targetQuery = new SearchRequestModel();
        targetQuery.types=['tcu'];
        const targetQueryResult:SearchResultsModel = {
            results:[ {
                deviceId: 'tcu001',
                awsIotThingArn: 'arn:aws:iot:us-east-1:123456789012:thing/device005'
            }]
        };

        const expected = ['arn:aws:iot:us-east-1:123456789012:thing/device001',
            'arn:aws:iot:us-east-1:123456789012:thing/device002',
            'arn:aws:iot:us-east-1:123456789012:thing/device003',
            'arn:aws:iot:us-east-1:123456789012:thing/device004',
            'arn:aws:iot:us-east-1:123456789012:thing/device005'
        ];

        // set up mocks
        mockedAssetLibraryGroupsService.listGroupMembersDevices =
            jest.fn().mockImplementationOnce(()=> ({results:[{awsIotThingArn:expected[0]},{awsIotThingArn:expected[1]}]}))
            .mockImplementationOnce(()=> ({results:[{awsIotThingArn:expected[2]},{awsIotThingArn:expected[3]}]}));

        mockedAssetLibrarySearchService.search = jest.fn().mockImplementationOnce(()=> targetQueryResult);

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets, targetQuery);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should build target list - a target query returning 4 devices paginated, returns 4 things as final targets', async () => {

        const commandId = 'cmd-005';
        const targetQuery = new SearchRequestModel();
        targetQuery.types=['tcu'];
        const targetQueryResult1:SearchResultsModel = {
            results:[ {
                deviceId: 'tcu001',
                awsIotThingArn: 'arn:aws:iot:us-east-1:123456789012:thing/device001'
            },{
                deviceId: 'tcu002',
                awsIotThingArn: 'arn:aws:iot:us-east-1:123456789012:thing/device002'
            }],
            pagination: {
                offset: 0,
                count: 2
            }
        };
        const targetQueryResult2:SearchResultsModel = {
            results:[ {
                deviceId: 'tcu003',
                awsIotThingArn: 'arn:aws:iot:us-east-1:123456789012:thing/device003'
            },{
                deviceId: 'tcu004',
                awsIotThingArn: 'arn:aws:iot:us-east-1:123456789012:thing/device004'
            }],
            pagination: {
                offset: 2,
                count: 2
            }
        };
        const targetQueryResult3:SearchResultsModel = {
            results:[ ],
            pagination: {
                offset: 4,
                count: 2
            }
        };

        const expected = ['arn:aws:iot:us-east-1:123456789012:thing/device001',
            'arn:aws:iot:us-east-1:123456789012:thing/device002',
            'arn:aws:iot:us-east-1:123456789012:thing/device003',
            'arn:aws:iot:us-east-1:123456789012:thing/device004'
        ];

        // set up mocks
        mockedAssetLibrarySearchService.search =
            jest.fn().mockImplementationOnce(()=> targetQueryResult1)
            .mockImplementationOnce(()=> targetQueryResult2)
            .mockImplementationOnce(()=> targetQueryResult3);

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, undefined, targetQuery);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    it('should identify an IoT Thing', async () => {

        const target = 'arn:aws:iot:us-east-1:123456789012:thing/thing1';
        const actual = instance.___testonly___getTargetType(target);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual).toEqual(TargetType.awsIotThing);

    });
    it('should identify an IoT Thing Group', async () => {

        const target = 'arn:aws:iot:us-east-1:123456789012:thinggroup/group1';
        const actual = instance.___testonly___getTargetType(target);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual).toEqual(TargetType.awsIotGroup);

    });
    it('should identify a CDF Group', async () => {

        const target = '/supplier/123';
        const actual = instance.___testonly___getTargetType(target);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual).toEqual(TargetType.cdfGroup);

    });
    it('should identify a CDF Device', async () => {

        const target = 'EDSN001';
        const actual = instance.___testonly___getTargetType(target);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual).toEqual(TargetType.cdfDevice);

    });
});
