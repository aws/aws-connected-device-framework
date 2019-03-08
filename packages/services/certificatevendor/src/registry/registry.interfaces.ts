export interface RegistryManager {
    isWhitelisted(deviceId:string): Promise<boolean>;
    updateAssetStatus(deviceId:string): Promise<void>;
}
