/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { Before, setDefaultTimeout} from 'cucumber';
import AWS = require('aws-sdk');
import config from 'config';

setDefaultTimeout(30 * 1000);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const templateBucket = config.get('provisioning.templates.bucket') as string;
const templatePrefix = config.get('provisioning.templates.prefix') as string;
// const templateSuffix = config.get('provisioning.templates.suffix') as string;

const s3 = new AWS.S3({region: config.get('aws.region')});
const iot = new AWS.Iot({region: config.get('aws.region')});

async function teardown() {
    // S3 cleanup - remove template from bucket
    const deleteObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}IntegrationTestTemplate.json`
    };
    await s3.deleteObject(deleteObjectRequest).promise();

    // IoT cleanup - delete cert, policy, thing
    const thingName = 'IntegrationTestThing';
    const policyName = 'IntegrationTestPolicy';

    let certificateId;
    try {
        const thingPrincipals = await iot.listThingPrincipals({thingName}).promise();
        const certArn = thingPrincipals.principals[0];
        certificateId = certArn.split('/')[1];

        await iot.detachPrincipalPolicy({principal: certArn, policyName}).promise();
        await iot.detachThingPrincipal({thingName, principal: certArn}).promise();
    } catch (err) {
        if (err.code!=='ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        if (certificateId!==undefined) {
            await iot.updateCertificate({certificateId, newStatus: 'INACTIVE'}).promise();
            await iot.deleteCertificate({certificateId}).promise();
        }
    } catch (err) {
        if (err.code!=='ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        await iot.deletePolicy({policyName}).promise();
    } catch (err) {
        if (err.code!=='ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        await iot.deleteThing({thingName}).promise();
    } catch (err) {
        if (err.code!=='ResourceNotFoundException') {
            throw err;
        }
    }
}

Before({tags: '@setup_thing_provisioning'}, async function () {
    await teardown();

    // create a provisioning template
    const integrationTestTemplate = {
        Parameters: {
            ThingName: {
                Type: 'String'
            },
            CSR: {
                Type: 'String'
            }
        },
        Resources: {
            thing: {
                Type: 'AWS::IoT::Thing',
                Properties: {
                    ThingName: {
                        Ref: 'ThingName'
                    }
                }
            },
            certificate : {
                Type : 'AWS::IoT::Certificate',
                Properties : {
                    CertificateSigningRequest: {Ref: 'CSR'}
                }
            },
            policy : {
                Type: 'AWS::IoT::Policy',
                Properties: {
                    PolicyName: 'IntegrationTestPolicy'
                }
            }
        }
    };
    // upload to S3
    const putObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}IntegrationTestTemplate.json`,
        Body: JSON.stringify(integrationTestTemplate)
    };
    await s3.putObject(putObjectRequest).promise();

    // create an IoT policy (if not exists)
    const policyName = 'IntegrationTestPolicy';
    try {
        await iot.getPolicy({policyName}).promise();
    } catch (e) {
        if (e.name==='ResourceNotFoundException') {
            const integrationTestPolicy = {
                policyName,
                policyDocument: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "iot:*","Resource": "*"}]}'};
            await iot.createPolicy(integrationTestPolicy).promise();
        }
    }
});

Before({tags: '@teardown_thing_provisioning'}, async function () {
    await teardown();
});
