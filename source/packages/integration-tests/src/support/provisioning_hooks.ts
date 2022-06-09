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

import { Before, setDefaultTimeout } from '@cucumber/cucumber';

import AWS = require('aws-sdk');
setDefaultTimeout(30 * 1000);
/*
    Cucumber describes current scenario context as “World”. It can be used to store the state of the scenario
    context (you can also define helper methods in it). World can be access by using the this keyword inside
    step functions (that’s why it’s not recommended to use arrow functions).
 */
// tslint:disable:no-invalid-this
// tslint:disable:only-arrow-functions

const templateBucket = process.env.PROVISIONING_TEMPLATES_BUCKET;
const templatePrefix = process.env.PROVISIONING_TEMPLATES_PREFIX;
// const templateSuffix = config.get('provisioning.templates.suffix') as string;

const s3 = new AWS.S3({ region: process.env.AWS_REGION });
const iot = new AWS.Iot({ region: process.env.AWS_REGION });

const BASIC_CSR_TEMPLATE_NAME = 'IntegrationTestTemplateWithCSR';

const BASIC_THING_NAME = 'BasicIntegrationTestThing';
const BASIC_POLICY_NAME = 'BasicIntegrationTestPolicy';

export const AWS_ISSUED_CERTIFICATE_TEMPLATE_NAME = 'IntegrationTestTemplateAwsIssued';
const AWS_ISSUED_THING_NAME = 'AwsIssuedIntegrationTestThing'
const AWS_ISSUED_POLICY_NAME = 'AwsIssuedIntegrationTestPolicy';

export const ACMPCA_TEMPLATE_NAME = 'IntegrationTestTemplateWithACMPCA';
const ACMPCA_THING_NAME = 'ACMPCAIntegrationTestThing';

async function teardownBasic() {
    // S3 cleanup - remove template from bucket
    await Promise.all([
        deleteTemplate(BASIC_CSR_TEMPLATE_NAME),
        deleteTemplate(AWS_ISSUED_CERTIFICATE_TEMPLATE_NAME),
        deleteThing(AWS_ISSUED_THING_NAME, AWS_ISSUED_POLICY_NAME),
        deleteThing(BASIC_THING_NAME, BASIC_POLICY_NAME)
    ]);
}

Before({ tags: '@setup_basic_provisioning' }, async function () {
    await teardownBasic();

    // create a provisioning template
    const template = {
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
            certificate: {
                Type: 'AWS::IoT::Certificate',
                Properties: {
                    CertificateSigningRequest: { Ref: 'CSR' }
                }
            },
            policy: {
                Type: 'AWS::IoT::Policy',
                Properties: {
                    PolicyName: BASIC_POLICY_NAME
                }
            }
        }
    };

    const awsIssuedTemplate = {
        "CDF": {
            "createDeviceAWSCertificate": true
        },
        "Parameters": {
            "ThingName": {
                "Type": "String"
            },
            "CertificateId": {
                "Type": "String"
            }
        },
        "Resources": {
            "thing": {
                "Type": "AWS::IoT::Thing",
                "Properties": {
                    "ThingName": {
                        "Ref": "ThingName"
                    }
                }
            },
            "certificate": {
                "Type": "AWS::IoT::Certificate",
                "Properties": {
                    "CertificateId": { "Ref": "CertificateId" }
                }
            },
            "policy": {
                "Type": "AWS::IoT::Policy",
                "Properties": {
                    "PolicyName": AWS_ISSUED_POLICY_NAME
                }
            }
        }
    }

    await Promise.all([
        uploadTemplate(BASIC_CSR_TEMPLATE_NAME, template),
        uploadTemplate(AWS_ISSUED_CERTIFICATE_TEMPLATE_NAME, awsIssuedTemplate),
        createTestPolicy(BASIC_POLICY_NAME),
        createTestPolicy(AWS_ISSUED_POLICY_NAME)
    ]);
});

Before({ tags: '@teardown_basic_provisioning' }, async function () {
    await teardownBasic();
});

async function teardownAcmpca() {
    await Promise.all([
        deleteTemplate(ACMPCA_TEMPLATE_NAME),
        deleteThing(ACMPCA_THING_NAME)
    ]);
}

Before({ tags: '@setup_acmpca_provisioning' }, async function () {
    await teardownAcmpca();

    // create a provisioning template
    const template = {
        Parameters: {
            ThingName: {
                Type: String
            },
            CertificateId: {
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
            certificate: {
                Type: 'AWS::IoT::Certificate',
                Properties: {
                    CertificateId: { Ref: "CertificateId" }
                }
            }
        },
        CDF: {
            useACMPCA: true
        }
    };
    await uploadTemplate(ACMPCA_TEMPLATE_NAME, template);
});

Before({ tags: '@teardown_acmpca_provisioning' }, async function () {
    await teardownAcmpca();
});

async function deleteThing(thingName: string, policyName?: string) {
    let certificateId;
    try {
        const thingPrincipals = await iot.listThingPrincipals({ thingName }).promise();
        const certArn = thingPrincipals.principals[0];
        certificateId = certArn?.split('/')[1];

        if (certArn && policyName) {
            await iot.detachPrincipalPolicy({ principal: certArn, policyName }).promise();
        }
        if (certArn) {
            await iot.detachThingPrincipal({ thingName, principal: certArn }).promise();
        }
    } catch (err) {
        if (err.code !== 'ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        if (certificateId !== undefined) {
            await iot.updateCertificate({ certificateId, newStatus: 'INACTIVE' }).promise();
            await iot.deleteCertificate({ certificateId }).promise();
        }
    } catch (err) {
        if (err.code !== 'ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        if (policyName) {
            await iot.deletePolicy({ policyName }).promise();
        }
    } catch (err) {
        if (err.code !== 'ResourceNotFoundException') {
            throw err;
        }
    }

    try {
        await iot.deleteThing({ thingName }).promise();
    } catch (err) {
        if (err.code !== 'ResourceNotFoundException') {
            throw err;
        }
    }
}

async function uploadTemplate(name: string, template: unknown): Promise<void> {
    // upload to S3
    const putObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}${name}.json`,
        Body: JSON.stringify(template)
    };
    await s3.putObject(putObjectRequest).promise();
}

async function deleteTemplate(name: string): Promise<void> {
    const deleteObjectRequest = {
        Bucket: templateBucket,
        Key: `${templatePrefix}${name}.json`
    };
    await s3.deleteObject(deleteObjectRequest).promise();
}

async function createTestPolicy(policyName: string): Promise<void> {
    // create an IoT policy (if not exists)
    try {
        await iot.getPolicy({ policyName }).promise();
    } catch (e) {
        if (e.name === 'ResourceNotFoundException') {
            const integrationTestPolicy = {
                policyName,
                policyDocument: '{"Version": "2012-10-17","Statement": [{"Effect": "Allow","Action": "iot:*","Resource": "*"}]}'
            };
            await iot.createPolicy(integrationTestPolicy).promise();
        }
    }
}