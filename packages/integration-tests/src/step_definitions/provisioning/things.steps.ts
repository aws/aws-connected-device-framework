/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
import 'reflect-metadata';
import { Before, Given, When, Then, setDefaultTimeout } from 'cucumber';
import { ThingsService, ProvisionThingRequest, ProvisionThingResponse } from '@cdf/provisioning-client';
import AWS = require('aws-sdk');
import chai_string = require('chai-string');
import { expect, use } from 'chai';
import { fail } from 'assert';
import config from 'config';
import {AUTHORIZATION_TOKEN, replaceTokens} from '../common/common.steps';
import {Dictionary} from '../../../../libraries/core/lambda-invoke/src';
import {container} from '../../di/inversify.config';
import {PROVISIONING_CLIENT_TYPES} from '@cdf/provisioning-client';
use(chai_string);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

setDefaultTimeout(10 * 1000);

const thingService: ThingsService = container.get(PROVISIONING_CLIENT_TYPES.ThingsService);
let iot: AWS.Iot;

function getAdditionalHeaders(world:any) : Dictionary {
    return  {
        Authorization: world[AUTHORIZATION_TOKEN]
    };
}

Before(function () {
    iot = new AWS.Iot({region: config.get('aws.region')});
});

Given('thing {string} does not exist', async function (thingName:string) {
    try {
        thingName = replaceTokens(thingName);

        const describeThingRequest = {thingName};
        const describeThingResponse = await iot.describeThing(describeThingRequest).promise();
        fail(`thing ${thingName} exists: ${JSON.stringify(describeThingResponse)}`);
    } catch (e) {
        expect(e.code).eq('ResourceNotFoundException');
    }
});

When('I provision a thing {string}', async function (thingName:string) {

    const csr  = '-----BEGIN CERTIFICATE REQUEST-----\nMIICnjCCAYYCAQAwWTELMAkGA1UEBhMCVVMxCzAJBgNVBAgMAldBMRAwDgYDVQQH\nDAdTZWF0dGxlMQ8wDQYDVQQKDAZBbWF6b24xDDAKBgNVBAsMA0FXUzEMMAoGA1UE\nAwwDSW9UMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAlXbnpMU4cslt\npMjyGXI1TZ8WcXWXrTh9Q8tzhYLSr7MJEu5Qbp9EAsEMW8tFdSJW6a0tA8JiM2je\nRZVhd6mpxkyzfJ2dTDu+7bQBw33Hg4PJ03yoLcPU39sh74SxL8Z4+vZVeKMI8U5y\nIoSHC0hXMXxNJkNXN7BNZUV/tAV/WVQL7dW9PFi7Mv3EyiHejSY+5PYsdNewlZh8\n5NdxDtFtQdphfr1Jd35hYlZPCXYLZfXaOWQ9sT+FWgxiZz9V62TU8Iw2zUHFE9bb\nP8rPRpgf4Eydg5J4IN/9gPR3Jh5WcTuuu5Y7NZMXFQ9By72B4W2Wofr4vGwGIY0G\nT6Kev/0slwIDAQABoAAwDQYJKoZIhvcNAQELBQADggEBAAsrPe5SraLjx+SZjN1g\n/E+y8qivssLoHDZhx/pnrQP6a05xHZM1j67yF8L2gl4ruPv2UplePgsC059aISzf\n5NOxKjO6qSMvZKpwHVpcv1WaDquEBjGB4dFSv8wSd59qecdazwmEl8Sfs1n1Cuip\n34HJdUZRlLY+pjW4EFWz2kcEDSVsYThAmCAdyIOYUuSlDv9K1rGbOx5xZxuh6NHx\naNQglt7zrAzoF9U/6ZeRJmmoyYJxeKcG6nB+fSuxJvk+00++HVpDVzgsON1wjrcL\nfChUneY7WsCprsnxXLQE3Z/G6JgT9hZ6ppHqOs7yEuJy0HLT+QHlflPNtUlGEUsl\n3Po=\n-----END CERTIFICATE REQUEST-----\n';

    thingName = replaceTokens(thingName);

    const provisionThingRequest:ProvisionThingRequest = {
        provisioningTemplateId: 'IntegrationTestTemplate',
        parameters: {
            ThingName: thingName,
            CSR: csr
        }
    };

    const provisionThingResponse:ProvisionThingResponse = await thingService.provisionThing(provisionThingRequest, getAdditionalHeaders(this));

    expect(provisionThingResponse.resourceArns['thing']).startsWith('arn:aws:iot:');
    expect(provisionThingResponse.resourceArns['thing']).endsWith(`thing/${thingName}`);
    expect(provisionThingResponse.resourceArns['certificate']).startsWith('arn:aws:iot:');
});

Then('the thing {string} is provisioned', async function (thingName:string) {
    thingName = replaceTokens(thingName);
    // validate thing, cert, policy exist and are attached
    const describeThingResponse = await iot.describeThing({thingName}).promise();
    expect(describeThingResponse.thingName).eq(thingName);
    const thingPrincipals = await iot.listThingPrincipals({thingName}).promise();
    const certArn = thingPrincipals.principals[0];
    const certificateId = certArn.split('/')[1];
    await iot.describeCertificate({certificateId}).promise();
    const policies = await iot.listPrincipalPolicies({principal: certArn}).promise();
    expect(policies.policies[0].policyName).eq('IntegrationTestPolicy');
});
