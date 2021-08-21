export interface GreengrassProvisioningWorld {
    lastTaskId?:string;
    lastGroupName?:string;
    groupNameToIds: {[name:string]: {
        groupId:string;
        versionId:string;
    }};
    errStatus?: unknown;
    authToken?:string;
}

export const world:GreengrassProvisioningWorld = {
    groupNameToIds: {}
};
