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
export class AWSProvisioningTemplate {
    Parameters: { [key:string] : Parameter };
    Resources: {
        thing?: Thing;
        certificate?: Certificate;
        policy?: Policy;
    };
}

export class CDFProvisioningTemplate extends AWSProvisioningTemplate {
    CDF?: {
        clientIdMustMatchThingName?: boolean;
        createDeviceCertificate?: boolean;
        registerDeviceCertificateWithoutCA?: boolean;
        attachAdditionalPolicies?: [{
            name?: string;
            document?: string;
        }]
    };
}
export class Parameter {
    Type:ParameterType;
    Default?:string;
}

export enum ParameterType {
    String = 'String'
}

export class Thing {
    Type:string;
    Properties: {
        ThingName: string | ParamaterReference,
        AttributePayload?: { [key:string] : string | ParamaterReference },
        ThingTypeName?: string | ParamaterReference,
        ThingGroups?: (string | ParamaterReference) []
    };
    OverrideSettings? : {
        AttributePayload? : OverrideSettings,
        ThingTypeName? : OverrideSettings,
        ThingGroups? : OverrideSettings
    };
}

export class Certificate {
    Type:string;
    Properties: {
        CertificateSigningRequest?: string | ParamaterReference,
        CertificateId?: string | ParamaterReference,
        CertificatePem?: string | ParamaterReference,
        CACertificatePem?: string | ParamaterReference,
        Status?: CertificateStatus
    };
    OverrideSettings? : {
        Status? : OverrideSettings
    };
}

export class Policy {
    Type:string;
    Properties: {
        PolicyName?: string | ParamaterReference,
        PolicyDocument: string;
    };
}

export enum CertificateStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE',
    PENDING_ACTIVATION = 'PENDING_ACTIVATION'
}

export class ParamaterReference {
    Ref: string;
}

export enum OverrideSettings {
    DO_NOTHING = 'DO_NOTHING',
    REPLACE = 'REPLACE',
    FAIL = 'FAIL',
    MERGE = 'MERGE'
}
