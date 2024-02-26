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
import 'reflect-metadata';

import { createMockInstance } from 'jest-create-mock-instance';
import { CreateAction } from './actions/eventaction.create';
import { EventActionFactory } from './actions/eventaction.factory';
import { UnsupportedAction } from './actions/eventaction.unsupported';
import { UpdateAction } from './actions/eventaction.update';
import { EventsDao } from './events.dao';
import { Category, EventModel, EventType } from './events.models';
import { EventsService } from './events.service';

describe('EventsService', () => {
    let instance: EventsService;
    let mockedEventActionFactory: jest.Mocked<EventActionFactory>;
    let mockedEventDao: jest.Mocked<EventsDao>;
    let updateAction: UpdateAction;
    let unsupportedAction: UnsupportedAction;
    let createAction: CreateAction;

    beforeEach(() => {
        mockedEventActionFactory = createMockInstance(EventActionFactory);
        mockedEventDao = createMockInstance(EventsDao);
        updateAction = new UpdateAction(mockedEventDao);
        unsupportedAction = new UnsupportedAction();
        createAction = new CreateAction(mockedEventDao);
        instance = new EventsService(mockedEventActionFactory);

        mockedEventDao.getLatest = jest.fn().mockImplementation((objectId) => {
            if (objectId === '/user/test_user_id') {
                return Promise.resolve({
                    objectId: '/user/test_user_id',
                    time: 'latest',
                    event: 'modify',
                    state: '{"groups":{},"attributes":{"email":"test_email@test.com","lastUserCaptureTime":"1698712913","country":"US","language":"en-us","firstName":"Test","lastName":"Tester"},"name":"test_user_id","templateId":"user","parentPath":"/user","groupPath":"/user/test_user_id","category":"group"}',
                    type: 'groups',
                });
            } else if (objectId === 'test_device_id') {
                return Promise.resolve({
                    objectId: 'test_device_id',
                    time: 'latest',
                    event: 'modify',
                    state: '{"attributes":{},"groups":{"out":{"manufactured_by":["/supplier/supplier1"],"has_firmware":["/firmware/firmwareId1"],"is_model":["/device/robot/testDevice"]}},"devices":{},"templateId":"testDevice","deviceId":"test_device_id","state":"unprovisioned","category":"device","connected":false}',
                    type: 'devices',
                });
            } else if ((objectId = 'test_undefined_object')) {
                return Promise.resolve(undefined);
            } else {
                return Promise.resolve(undefined);
            }
        });

        mockedEventDao.update = jest.fn().mockImplementation(() => {
            return Promise.resolve();
        });
        mockedEventDao.create = jest.fn().mockImplementation(() => {
            return Promise.resolve();
        });

        mockedEventActionFactory.getAction = jest.fn().mockImplementation((event) => {
            if (event.event === EventType.modify) {
                return [updateAction];
            } else if (event.event === EventType.create) {
                return [createAction];
            }
            return [unsupportedAction];
        });
    });

    it('happy path update a pre-existing group', async () => {
        let testEvent = {
            objectId: '/user/test_user_id',
            type: Category.groups,
            event: EventType.modify,
            attributes: {
                sourceGroupPath: '/user/test_user_id',
                detachedFromGroup: '/client_device/test_device_id',
                relationship: 'uses',
            },
            time: '2024-02-23T21:00:00.000Z',
        };
        await instance.create(testEvent);

        expect(mockedEventDao.create).toBeCalledTimes(1);
        expect(mockedEventDao.update).toBeCalledTimes(1);
    });

    it('happy path update a pre-existing device', async () => {
        let testEvent: EventModel = {
            objectId: 'test_device_id',
            type: Category.devices,
            event: EventType.modify,
            payload:
                '{"attributes":{},"groups":{},"devices":{},"deviceId":"test_device_id","connected":false,"templateId":"testDevice","category":"device"}',
            time: '2024-02-24T20:00:00.000Z',
            attributes: undefined,
        };
        await instance.create(testEvent);

        expect(mockedEventDao.create).toBeCalledTimes(1);
        expect(mockedEventDao.update).toBeCalledTimes(1);
    });

    it('happy path create a new device', async () => {
        let testEvent: EventModel = {
            objectId: 'test_device_id',
            type: Category.devices,
            event: EventType.create,
            payload:
                '{"attributes":{},"groups":{},"devices":{},"deviceId":"test_device_id","connected":false,"templateId":"testDevice","category":"device"}',
            time: '2024-02-24T20:00:00.000Z',
            attributes: undefined,
        };
        await instance.create(testEvent);

        expect(mockedEventDao.create).toBeCalledTimes(2);
        expect(mockedEventDao.update).toBeCalledTimes(0);
    });

    it('getLatest returns an undefined object on a "modify" call', async () => {
        let testEvent: EventModel = {
            objectId: 'test_undefined_object',
            type: Category.devices,
            event: EventType.modify,
            payload:
                '{"attributes":{},"groups":{},"devices":{},"deviceId":"test_undefined_object","connected":false,"templateId":"testDevice","category":"device"}',
            time: '2024-02-24T20:00:00.000Z',
            attributes: undefined,
        };
        await instance.create(testEvent);

        expect(mockedEventDao.create).toBeCalledTimes(1);
        expect(mockedEventDao.update).toBeCalledTimes(1);
    });
});
