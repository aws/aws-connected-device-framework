
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
