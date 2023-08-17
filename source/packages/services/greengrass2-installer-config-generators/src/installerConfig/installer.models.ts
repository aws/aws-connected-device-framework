import { FleetProvisioningByClaimConfig } from './fleetProvisioningByClaim.models';
import { GreengrassNucleusConfig } from './nucleus.models';

export interface InstallerConfig {
    system?: {
        certificateFilePath: string;
        privateKeyPath: string;
        rootCaPath: string;
        rootpath: string;
        thingName: string;
    };

    services: {
        'aws.greengrass.Nucleus'?: {
            componentType: string;
            version: string;
            configuration: GreengrassNucleusConfig;
        };
        'aws.greengrass.FleetProvisioningByClaim'?: {
            configuration: FleetProvisioningByClaimConfig;
        };
    };
}
