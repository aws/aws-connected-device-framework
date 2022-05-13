import { SearchRequestModel } from "@cdf/assetlibrary-client";

export interface ListThingsRequest {
    thingNames?:string[],
    thingGroupNames?:string[],
    assetLibraryDeviceIds?:string[],
    assetLibraryGroupPaths?:string[],
    assetLibraryQuery?:SearchRequestModel
}

export interface ListThingsResponse {
    thingNames?:string[],
    arnsOutOfRegion?:string[],
}


export const enum TargetType {
    awsIotThing, awsIotGroup, cdfDevice, cdfGroup, unknown
}

