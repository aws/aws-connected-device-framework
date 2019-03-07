/*-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { TemplatesService } from '../../templates/templates.service';
import { DevicesService, GroupsService } from '@cdf/assetlibrary-client/dist';
import { ThingsService } from '@cdf/provisioning-client/dist';
import { StartJobAction, TargetType } from './workflow.startjob';

import { CommandsDao } from '../commands.dao';

// tslint:disable-next-line:no-var-requires
const AWSMock = require('aws-sdk-mock');
import AWS = require('aws-sdk');
AWSMock.setSDKInstance(AWS);
AWS.config.update({ region: 'us-east-1' });

let mockedTemplatesService: jest.Mocked<TemplatesService>;
let mockedCommandsDao: jest.Mocked<CommandsDao>;
let mockedAssetLibraryDevicesService: jest.Mocked<DevicesService>;
let mockedAssetLibraryGroupsService: jest.Mocked<GroupsService>;
let mockedProvisioningThingsService: jest.Mocked<ThingsService>;
let instance: StartJobAction;
let mockedIot: AWS.Iot;
const mockedS3: AWS.S3 = null;

describe('StartJobAction', () => {

    beforeEach(() => {

        mockedTemplatesService = createMockInstance(TemplatesService);
        mockedCommandsDao = createMockInstance(CommandsDao);
        mockedAssetLibraryDevicesService = createMockInstance(DevicesService);
        mockedAssetLibraryGroupsService = createMockInstance(GroupsService);
        mockedProvisioningThingsService = createMockInstance(ThingsService);
        // mockedS3 = new AWS.S3();
        // mockedIot = new AWS.Iot();

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
            mockedAssetLibraryGroupsService, mockedProvisioningThingsService, s3Bucket, s3Prefix, s3RoleArn, maxTargets,
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
        const actual = await instance.___testonly___buildTargetList(commandId, targets);

        // Finally, verify the results
        expect(actual).toBeDefined();
        expect(actual.length).toEqual(expected.length);
        expect(actual).toEqual(expect.arrayContaining(expected));

    }, 15000);

    // aws-sdk-mock mocks cannot be made within an async method, therefore must mock the call OUTSIDE the test method
    AWSMock.mock('Iot', 'createThingGroup', (_params:AWS.Iot.Types.CreateThingGroupRequest, callback?: (err: AWS.AWSError, data: AWS.Iot.Types.CreateThingGroupResponse) => void) => {
        callback(null, {thingGroupArn: 'arn:aws:iot:us-east-1:123456789012:thinggroup/ephemeral-cmd-002'});
    });
    mockedIot = new AWS.Iot();
    it('should build target list - 130 things returns 1 ephemeral group as final target', async () => {

        const commandId = 'cmd-002';
        const targets:string[]=[];
        for(let x=0; x<130; x++) {
            targets.push(`arn:aws:iot:us-east-1:123456789012:thing/thing${x}`);
        }
        const expected = [`arn:aws:iot:us-east-1:123456789012:thinggroup/ephemeral-${commandId}`];

        mockedProvisioningThingsService.bulkProvisionThings.mockResolvedValueOnce({taskId:'123'});

        mockedProvisioningThingsService.getBulkProvisionTask
            .mockResolvedValueOnce({taskId:'123', status:'InProgress'})
            .mockResolvedValueOnce({taskId:'123', status:'Completed'});

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets);
        // must call restore once all mocked promises have resolved
        AWSMock.restore();

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
        const actual = await instance.___testonly___buildTargetList(commandId, targets);

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
            await instance.___testonly___buildTargetList(commandId, targets);
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
        mockedAssetLibraryDevicesService.getDevicesByID
            .mockResolvedValueOnce({results:[{awsIotThingArn:expected[0]},{awsIotThingArn:expected[1]}]});

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets);

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
        mockedAssetLibraryGroupsService.listGroupMembersDevices
            .mockResolvedValueOnce({results:[{awsIotThingArn:expected[0]},{awsIotThingArn:expected[1]}]})
            .mockResolvedValueOnce({results:[{awsIotThingArn:expected[2]},{awsIotThingArn:expected[3]}]});

        // execute
        const actual = await instance.___testonly___buildTargetList(commandId, targets);

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

// class MockCreateThingGroupResponse {
//     public response: AWS.Iot.Types.CreateThingGroupResponse;
//     public error: AWSError;

//     promise(): Promise<AWS.Iot.Types.CreateThingGroupResponse> {
//         return new Promise((resolve, reject) => {
//             if (this.error !== null) {
//                 return reject(this.error);
//             } else {
//                 return resolve(this.response);
//             }
//         });
//     }
// }
