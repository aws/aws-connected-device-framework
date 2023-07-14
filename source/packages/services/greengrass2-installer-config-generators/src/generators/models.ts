import { Handler } from 'aws-lambda';

export type ConfigGeneratorEvent = {
    version: string;
    coreDeviceName: string;
    provisioningTemplate?: string;
    templateParameters?: { [key: string]: string };
    cdfProvisioningParameters?: CdfProvisioningParameters;
};

export interface CdfProvisioningParameters {
    caId?: string;
    certInfo?: {
        commonName?: string;
        organization?: string;
        organizationalUnit?: string;
        locality?: string;
        stateName?: string;
        country?: string;
        emailAddress?: string;
        daysExpiry?: number;
    };
}

export type ConfigGeneratorHandler = Handler<ConfigGeneratorEvent, unknown>;
