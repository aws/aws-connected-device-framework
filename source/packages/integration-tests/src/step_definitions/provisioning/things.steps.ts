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

import { fail } from 'assert';
import { expect, use } from 'chai';
import { Before, Given, setDefaultTimeout, Then, When } from '@cucumber/cucumber';

import {
    PROVISIONING_CLIENT_TYPES,
    ProvisionThingRequest,
    ProvisionThingResponse,
    ThingsService,
} from '@awssolutions/cdf-provisioning-client';

import { Dictionary } from '@awssolutions/cdf-lambda-invoke';
import { container } from '../../di/inversify.config';
import { AUTHORIZATION_TOKEN, replaceTokens } from '../common/common.steps';

import AWS = require('aws-sdk');
import chai_string = require('chai-string');
import { ACMPCA_TEMPLATE_NAME, AWS_ISSUED_CERTIFICATE_TEMPLATE_NAME } from '../../support/provisioning_hooks';

use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const SAMPLE_CSR = '-----BEGIN CERTIFICATE REQUEST-----\nMIICnjCCAYYCAQAwWTELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQH\nDAdTZWF0dGxlMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzEMMAoGA1UE\nAwwDSW9UMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlXbnpMU4cslt\npMjyGXI1TZ8WcXWXrTh9Q8tzhYLSr7MJEu5Qbp9EAsEMW8tFdSJW6a0tA8JiM2je\nRZVhd6mpxkyzfJ2dTDu+7bQBw33Hg4PJ03yoLcPU39sh74SxL8Z4+vZVeKMI8U5y\nIoSHC0hXMXxNJkNXN7BNZUV/tAV/WVQL7dW9PFi7Mv3EyiHejSY+5PYsdNewlZh8\n5NdxDtFtQdphfr1Jd35hYlZPCXYLZfXaOWQ9sT+FWgxiZz9V62TU8Iw2zUHFE9bb\nP8rPRpgf4Eydg5J4IN/9gPR3Jh5WcTuuu5Y7NZMXFQ9By72B4W2Wofr4vGwGIY0G\nT6Kev/0slwIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAAsrPe5SraLjx+SZjN1g\n/E+y8qivssLoHDZhx/pnrQP6a05xHZM1j67yF8L2gl4ruPv2UplePgsC059aISzf\n5NOxKjO6qSMvZKpwHVpcv1WaDquEBjGB4dFSv8wSd59qecdazwmEl8Sfs1n1Cuip\n34HJdUZRlLY+pjW4EFWz2kcEDSVsYThAmCAdyIOYUuSlDv9K1rGbOx5xZxuh6NHx\naNQglt7zrAzoF9U/6ZeRJmmoyYJxeKcG6nB+fSuxJvk+00++HVpDVzgsON1wjrcL\nfChUneY7WsCprsnxXLQE3Z/G6JgT9hZ6ppHqOs7yEuJy0HLT+QHlflPNtUlGEUsl\n3Po=\n-----END CERTIFICATE REQUEST-----\n';

const thingService: ThingsService = container.get(PROVISIONING_CLIENT_TYPES.ThingsService);
let iot: AWS.Iot;

function getAdditionalHeaders(world: unknown): Dictionary {
    return {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

Before(function () {
    iot = new AWS.Iot({ region: process.env.AWS_REGION });
});

Given('thing {string} exists', async function (deviceId: string) {
    try {
        deviceId = replaceTokens(deviceId);

        const describeThingRequest = { thingName: deviceId };
        const describeThingResponse = await iot.describeThing(describeThingRequest).promise();
        expect(describeThingResponse.thingName).exist;
    } catch (e) {
        expect(e.code).eq('ResourceNotFoundException');
        fail(`device ${deviceId} does not exist: ${JSON.stringify(e)}`);
    }
});

Given('thing {string} does not exist', async function (thingName: string) {
    try {
        thingName = replaceTokens(thingName);

        const describeThingRequest = { thingName };
        const describeThingResponse = await iot.describeThing(describeThingRequest).promise();
        fail(`thing ${thingName} exists: ${JSON.stringify(describeThingResponse)}`);
    } catch (e) {
        expect(e.code).eq('ResourceNotFoundException');
    }
});

When('I provision a thing {string} using a csr', async function (thingName: string) {

    thingName = replaceTokens(thingName);

    const provisionThingRequest: ProvisionThingRequest = {
        provisioningTemplateId: "IntegrationTestTemplateWithCSR",
        parameters: {
            ThingName: thingName,
            CSR: SAMPLE_CSR
        }
    };

    const provisionThingResponse: ProvisionThingResponse = await thingService.provisionThing(provisionThingRequest, getAdditionalHeaders(this));

    expect(provisionThingResponse.resourceArns['thing']).startsWith('arn:aws:iot:');
    expect(provisionThingResponse.resourceArns['thing']).endsWith(`thing/${thingName}`);
    expect(provisionThingResponse.resourceArns['certificate']).startsWith('arn:aws:iot:');
});


When('I provision a thing {string} using aws iot certificate', async function (thingName: string) {
    thingName = replaceTokens(thingName);
    const provisionThingRequest: ProvisionThingRequest = {
        provisioningTemplateId: AWS_ISSUED_CERTIFICATE_TEMPLATE_NAME,
        parameters: {
            ThingName: thingName
        }
    };

    const provisionThingResponse: ProvisionThingResponse = await thingService.provisionThing(provisionThingRequest, getAdditionalHeaders(this));

    expect(provisionThingResponse.resourceArns['thing']).startsWith('arn:aws:iot:');
    expect(provisionThingResponse.resourceArns['thing']).endsWith(`thing/${thingName}`);
    expect(provisionThingResponse.resourceArns['certificate']).startsWith('arn:aws:iot:');
});

When('I provision a thing {string} using acmpca', async function (thingName: string) {

    thingName = replaceTokens(thingName);

    const provisionThingRequest: ProvisionThingRequest = {
        provisioningTemplateId: ACMPCA_TEMPLATE_NAME,
        parameters: {
            ThingName: thingName
        },
        cdfProvisioningParameters: {
            acmpcaCaArn: process.env.PROVISIONING_ACM_PCA_ARN,
            certInfo: {
                country: 'US'
            }
        }
    };

    const provisionThingResponse: ProvisionThingResponse = await thingService.provisionThing(provisionThingRequest, getAdditionalHeaders(this));

    expect(provisionThingResponse.resourceArns['thing']).startsWith('arn:aws:iot:');
    expect(provisionThingResponse.resourceArns['thing']).endsWith(`thing/${thingName}`);
    expect(provisionThingResponse.resourceArns['certificate']).startsWith('arn:aws:iot:');
});

Then('the thing {string} is provisioned', async function (thingName: string) {
    thingName = replaceTokens(thingName);
    // validate thing, cert, policy exist and are attached
    const describeThingResponse = await iot.describeThing({ thingName }).promise();
    expect(describeThingResponse.thingName).eq(thingName);
    const thingPrincipals = await iot.listThingPrincipals({ thingName }).promise();
    const certArn = thingPrincipals.principals[0];
    const certificateId = certArn.split('/')[1];
    await iot.describeCertificate({ certificateId }).promise();
});

Then('thing {string} belongs to thing group {string}', async function (thingName: string, thingGroupName: string) {
    thingName = replaceTokens(thingName);
    thingGroupName = replaceTokens(thingGroupName);
    const r = await iot.listThingGroupsForThing({thingName}).promise();
    const exists = (r?.thingGroups?.filter(tg=>tg.groupName===thingGroupName)?.length??0)>0;
    expect(exists).eq(true);
});

Then('thing {string} does not belong to thing group {string}', async function (thingName: string, thingGroupName: string) {
    thingName = replaceTokens(thingName);
    thingGroupName = replaceTokens(thingGroupName);
    const r = await iot.listThingGroupsForThing({thingName}).promise();
    const exists = (r?.thingGroups?.filter(tg=>tg.groupName===thingGroupName)?.length??0)>0;
    expect(exists).eq(false);
});
