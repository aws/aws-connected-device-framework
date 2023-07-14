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
import { createMockInstance } from 'jest-create-mock-instance';
import 'reflect-metadata';

import { EventEmitter } from '../events/eventEmitter.service';
import { SchemaValidatorService } from '../types/schemaValidator.full.service';
import { PoliciesAssembler } from './policies.assembler';
import { PoliciesDaoFull } from './policies.full.dao';
import { PoliciesServiceFull } from './policies.full.service';
import { AttachedPolicy, PolicyModel } from './policies.models';
import { PoliciesService } from './policies.service';

describe('PoliciesService', () => {
    let mockedDao: jest.Mocked<PoliciesDaoFull>;
    let mockedSchemaValidatorService: jest.Mocked<SchemaValidatorService>;
    let mockedAssembler: jest.Mocked<PoliciesAssembler>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let instance: PoliciesService;

    beforeEach(() => {
        mockedDao = createMockInstance(PoliciesDaoFull);
        mockedSchemaValidatorService = createMockInstance(SchemaValidatorService);
        mockedAssembler = createMockInstance(PoliciesAssembler);
        mockedEventEmitter = createMockInstance(EventEmitter);
        instance = new PoliciesServiceFull(
            mockedEventEmitter,
            mockedAssembler,
            mockedDao,
            mockedSchemaValidatorService
        );
    });

    it('A single attached policy matches on both device groups and type', async () => {
        // set up the stubs
        const attachedPolicies: AttachedPolicy[] = [];
        attachedPolicies.push(
            attachedPolicyStub(
                'policy1',
                'provisioningtemplate',
                ['/l1/l2/l3', '/a/b/c'],
                ['/l1', '/a']
            )
        );

        const matchedPolicies: AttachedPolicy[] = [];
        Object.assign(matchedPolicies, attachedPolicies);

        const expected: PolicyModel[] = [];
        expected.push(policyModelStub('policy1', 'provisioningtemplate', ['/l1', '/a']));

        // Set the mocks on the dependent classes
        mockedDao.listDeviceAttachedPolicies = jest
            .fn()
            .mockImplementation(() => attachedPolicies);

        mockedAssembler.toModelFromPolicies = jest.fn().mockImplementation(() => expected);

        // Make the call
        const inheritedPolicies = await instance.listInheritedByDevice(
            'device001',
            'provisioningtemplate'
        );

        // Finally, verify the results
        expect(mockedAssembler.toModelFromPolicies.mock.calls[0][0]).toEqual(matchedPolicies);

        expect(inheritedPolicies).toBeDefined();
        expect(inheritedPolicies).toEqual(expected);
    });

    it('2 attached policies provided, but ony 1 matches on both device parent groups and type', async () => {
        // set up the stubs
        const attachedPolicies: AttachedPolicy[] = [];
        attachedPolicies.push(
            attachedPolicyStub(
                'policy1',
                'provisioningtemplate',
                ['/l1/l2/l3', '/a/b/c'],
                ['/l1', '/a']
            )
        );
        attachedPolicies.push(
            attachedPolicyStub(
                'policy1',
                'provisioningtemplate',
                ['/l1/l2/l3', '/a/b/c'],
                ['/l1', '/nomatch']
            )
        );

        const matchedPolicies: AttachedPolicy[] = [];
        matchedPolicies.push(
            attachedPolicyStub(
                'policy1',
                'provisioningtemplate',
                ['/l1/l2/l3', '/a/b/c'],
                ['/l1', '/a']
            )
        );

        const expected: PolicyModel[] = [];
        expected.push(policyModelStub('policy1', 'provisioningtemplate', ['/l1', '/a']));

        // Set the mocks on the dependent classes
        mockedDao.listDeviceAttachedPolicies = jest
            .fn()
            .mockImplementation(() => attachedPolicies);

        mockedAssembler.toModelFromPolicies = jest.fn().mockImplementation(() => expected);

        // Make the call
        const inheritedPolicies = await instance.listInheritedByDevice(
            'device001',
            'provisioningtemplate'
        );

        // Finally, verify the results
        expect(mockedAssembler.toModelFromPolicies.mock.calls[0][0]).toEqual(matchedPolicies);

        expect(inheritedPolicies).toBeDefined();
        expect(inheritedPolicies).toEqual(expected);
    });
});

function policyModelStub(policyId: string, type: string, appliesTo: string[]): PolicyModel {
    const pm = new PolicyModel();
    pm.policyId = policyId;
    pm.type = type;
    pm.description = `${policyId} description`;
    pm.document = `${policyId} document`;
    pm.appliesTo = appliesTo;
    return pm;
}

function attachedPolicyStub(
    policyId: string,
    type: string,
    groups: string[],
    policyGroups: string[]
): AttachedPolicy {
    const response = new AttachedPolicy();
    response.policy = {
        id: `policy___${policyId}`,
        type: `${type}`,
        policyId: [policyId],
        description: [`${policyId} description`],
        document: [`${policyId} document`],
    };

    if (groups) {
        groups.forEach((v) => {
            if (response.groups === undefined) {
                response.groups = [];
            }
            response.groups.push({
                id: `group___${v}`,
                label: 'group',
            });
        });
    }

    if (policyGroups) {
        policyGroups.forEach((v) => {
            if (response.policyGroups === undefined) {
                response.policyGroups = [];
            }
            response.policyGroups.push({
                id: `group___${v}`,
                label: 'group',
            });
        });
    }

    return response;
}
