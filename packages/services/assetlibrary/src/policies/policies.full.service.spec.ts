/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { createMockInstance } from 'jest-create-mock-instance';

import { logger} from '../utils/logger';
import { PoliciesServiceFull } from './policies.full.service';
import { PoliciesAssembler } from './policies.assembler';
import { TypesService } from '../types/types.service';
import { TypesServiceFull } from '../types/types.full.service';
import { PoliciesDaoFull } from './policies.full.dao';
import { AttachedPolicy, PolicyModel } from './policies.models';
import {EventEmitter} from '../events/eventEmitter.service';
import { PoliciesService } from './policies.service';

describe('PoliciesService', () => {
    let mockedDao: jest.Mocked<PoliciesDaoFull>;
    let mockedTypesService: jest.Mocked<TypesService>;
    let mockedAssembler: jest.Mocked<PoliciesAssembler>;
    let mockedEventEmitter: jest.Mocked<EventEmitter>;
    let instance: PoliciesService;

    beforeEach(() => {
        mockedDao = createMockInstance(PoliciesDaoFull);
        mockedTypesService = createMockInstance(TypesServiceFull);
        mockedAssembler = createMockInstance(PoliciesAssembler);
        mockedEventEmitter = createMockInstance(EventEmitter);
        instance = new PoliciesServiceFull(mockedDao, mockedAssembler, mockedTypesService, mockedEventEmitter);
    });

    it('A single attached policy matches on both device groups and type', async () => {

        // set up the stubs
        const attachedPolicies: AttachedPolicy[]=[];
        attachedPolicies.push( attachedPolicyStub('policy1', 'provisioningtemplate', ['/l1/l2/l3','/a/b/c'], ['/l1','/a']));

        const matchedPolicies:  AttachedPolicy[]=[];
        Object.assign(matchedPolicies, attachedPolicies);

        const expected: PolicyModel[]=[];
        expected.push( policyModelStub('policy1', 'provisioningtemplate', ['/l1','/a']));

        // Set the mocks on the dependent classes
        mockedDao.listDeviceAttachedPolicies = jest.fn().mockImplementation(()=> attachedPolicies);

        mockedAssembler.toModelFromPolicies = jest.fn().mockImplementation(()=> expected);

        // Make the call
        const inheritedPolicies = await instance.listInheritedByDevice('device001', 'provisioningtemplate');
        logger.debug(`TEST inheritedPolicies: ${JSON.stringify(inheritedPolicies)}`);

        // Finally, verify the results
        expect(mockedAssembler.toModelFromPolicies.mock.calls[0][0]).toEqual(matchedPolicies);

        expect(inheritedPolicies).toBeDefined();
        expect(inheritedPolicies).toEqual(expected);

    });

    it('2 attached policies provided, but ony 1 matches on both device parent groups and type', async () => {

        // set up the stubs
        const attachedPolicies: AttachedPolicy[]=[];
        attachedPolicies.push( attachedPolicyStub('policy1', 'provisioningtemplate', ['/l1/l2/l3','/a/b/c'], ['/l1','/a']));
        attachedPolicies.push( attachedPolicyStub('policy1', 'provisioningtemplate', ['/l1/l2/l3','/a/b/c'], ['/l1','/nomatch']));

        const matchedPolicies:  AttachedPolicy[]=[];
        matchedPolicies.push( attachedPolicyStub('policy1', 'provisioningtemplate', ['/l1/l2/l3','/a/b/c'], ['/l1','/a']));

        const expected: PolicyModel[]=[];
        expected.push( policyModelStub('policy1', 'provisioningtemplate', ['/l1','/a']));

        // Set the mocks on the dependent classes
        mockedDao.listDeviceAttachedPolicies = jest.fn().mockImplementation(()=> attachedPolicies);

        mockedAssembler.toModelFromPolicies = jest.fn().mockImplementation(()=> expected);

        // Make the call
        const inheritedPolicies = await instance.listInheritedByDevice('device001', 'provisioningtemplate');
        logger.debug(`TEST inheritedPolicies: ${JSON.stringify(inheritedPolicies)}`);

        // Finally, verify the results
        expect(mockedAssembler.toModelFromPolicies.mock.calls[0][0]).toEqual(matchedPolicies);

        expect(inheritedPolicies).toBeDefined();
        expect(inheritedPolicies).toEqual(expected);

    });

});

function policyModelStub(policyId:string, type:string, appliesTo: string[]): PolicyModel {
    const pm = new PolicyModel();
    pm.policyId=policyId;
    pm.type=type;
    pm.description=`${policyId} description`;
    pm.document=`${policyId} document`;
    pm.appliesTo=appliesTo;
    return pm;
}

function attachedPolicyStub(policyId:string, type:string, groups:string[], policyGroups:string[]): AttachedPolicy {

    const response = new AttachedPolicy();
    response.policy = {
        id: `policy___${policyId}`,
        type: `${type}`,
        policyId: [policyId],
        description: [`${policyId} description`],
        document: [`${policyId} document`]
    };

    if ( groups) {
        groups.forEach(v=> {
            if (response.groups===undefined) {
                response.groups = [];
            }
            response.groups.push({
                id: `group___${v}`,
                label: 'group'
            });
        });
    }

    if ( policyGroups) {
        policyGroups.forEach(v=> {
            if (response.policyGroups===undefined) {
                response.policyGroups = [];
            }
            response.policyGroups.push({
                id: `group___${v}`,
                label: 'group'
            });
        });
    }

    return response;
}
