import { ListrTask } from 'listr2';
import { ApiGwInstaller } from '../commands/modules/infrastructure/apigw';
import { DeploymentHelperInstaller } from '../commands/modules/infrastructure/deploymentHelper';
import { EvenBusInstaller } from '../commands/modules/infrastructure/eventBus';
import { KmsKeyInstaller } from '../commands/modules/infrastructure/kms';
import { OpenSslInstaller } from '../commands/modules/infrastructure/openSsl';
import { VpcInstaller } from '../commands/modules/infrastructure/vpc';
import { AssetLibraryInstaller } from '../commands/modules/service/assetLibrary';
import { AssetLibraryExportInstaller } from '../commands/modules/service/assetLibraryExport';
import { AssetLibraryHistoryInstaller } from '../commands/modules/service/assetLibraryHistory';
import { AuthDeviceCertInstaller } from '../commands/modules/service/authDeviceCert';
import { BulkCertificatesInstaller } from '../commands/modules/service/bulkCerts';
import { CertificateActivatorInstaller } from '../commands/modules/service/certificateActivator';
import { CertificateVendorInstaller } from '../commands/modules/service/certificateVendor';
import { CommandAndControlInstaller } from '../commands/modules/service/commandAndControl';
import { CommandsInstaller } from '../commands/modules/service/commands';
import { DeviceMonitoringInstaller } from '../commands/modules/service/deviceMonitoring';
import { DevicePatcherInstaller } from '../commands/modules/service/devicePatcher';
import { FleetSimulatorInstaller } from '../commands/modules/service/fleetSimulator';
import { Greengrass2InstallerConfigGeneratorsInstaller } from '../commands/modules/service/greengrass2InstallerConfigGenerators';
import { Greengrass2ProvisioningInstaller } from '../commands/modules/service/greengrass2Provisioning';
import { NotificationsInstaller } from '../commands/modules/service/notifications';
import { OrganizationManagerInstaller } from '../commands/modules/service/organizationManager';
import { ProvisioningInstaller } from '../commands/modules/service/provisioning';
import { Answers } from './answers';

export type ModuleName =
    // infrastructure modules:
    | 'apigw'
    | 'deploymentHelper'
    | 'eventBus'
    | 'kms'
    | 'openSsl'
    // service modules:
    | 'assetLibrary'
    | 'assetLibraryExport'
    | 'assetLibraryHistory'
    | 'authDeviceCert'
    | 'commandAndControl'
    | 'devicePatcher'
    | 'bulkCerts'
    | 'certificateActivator'
    | 'certificateVendor'
    | 'commands'
    | 'deviceMonitoring'
    | 'fleetSimulator'
    | 'greengrass2InstallerConfigGenerators'
    | 'greengrass2Provisioning'
    | 'notifications'
    | 'organizationManager'
    | 'provisioning'
    | 'vpc';

export interface Module {
    name: ModuleName;
    friendlyName: string;
    dependsOnMandatory: ModuleName[];
    dependsOnOptional: ModuleName[];
    type: 'SERVICE' | 'INFRASTRUCTURE';
    prompts: (answers: Answers) => Promise<Answers>;
    install: (answers: Answers) => Promise<[Answers, ListrTask[]]>;
    package: (answers: Answers) => Promise<[Answers, ListrTask[]]>;
    delete: (answers: Answers) => Promise<ListrTask[]>;
}

export interface PostmanEnvironment {
    key: string;
    value: string;
    enabled: boolean;
}
export interface ServiceModule extends Module {
    stackName: string;
}
export interface RestModule extends ServiceModule {
    localProjectDir: string;
    generatePostmanEnvironment: (answers: Answers) => Promise<PostmanEnvironment>;
}

export type InfrastructureModule = Module;

export const loadModules = (environment: string): Module[] => {
    const modules: Module[] = [
        // infrastructure modules:
        new ApiGwInstaller(),
        new KmsKeyInstaller(),
        new DeploymentHelperInstaller(environment),
        new EvenBusInstaller(environment),
        new VpcInstaller(environment),
        new OpenSslInstaller(environment),
        // service modules:
        new AssetLibraryInstaller(environment),
        new AssetLibraryHistoryInstaller(environment),
        new AssetLibraryExportInstaller(environment),
        new AuthDeviceCertInstaller(environment),
        new BulkCertificatesInstaller(environment),
        new CertificateActivatorInstaller(environment),
        new CertificateVendorInstaller(environment),
        new CommandsInstaller(environment),
        new CommandAndControlInstaller(environment),
        new DeviceMonitoringInstaller(environment),
        new DevicePatcherInstaller(environment),
        new FleetSimulatorInstaller(environment),
        new Greengrass2InstallerConfigGeneratorsInstaller(environment),
        new Greengrass2ProvisioningInstaller(environment),
        new NotificationsInstaller(environment),
        new ProvisioningInstaller(environment),
        new OrganizationManagerInstaller(environment),
    ];
    return modules;
};
