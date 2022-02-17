export interface Greengrass2ProvisioningWorld {
    lastCoreTaskId?:string;
    lastClientDeviceTaskId?:string;
    lastDeploymentTaskId?:string;
    errStatus?: unknown;
    authToken?:string;
    lastAssociatedClientDevices?: string[];
}

export const world:Greengrass2ProvisioningWorld = {
    
};
