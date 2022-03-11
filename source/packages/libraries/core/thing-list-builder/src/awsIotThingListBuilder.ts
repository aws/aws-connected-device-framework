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

import { inject, injectable } from 'inversify';

import { IoTClient, ListThingsInThingGroupCommand } from '@aws-sdk/client-iot';
import {
    ASSETLIBRARY_CLIENT_TYPES, Device10Resource, DevicesService, Group10Resource, GroupsService,
    SearchRequestModel, SearchService
} from '@cdf/assetlibrary-client';

import { THING_LIST_BUILDER_TYPES } from './di/types';
import { TargetType } from './models';
import { logger } from './utils/logger.util';

@injectable()
export class AwsIotThingListBuilder {

  private iot: IoTClient;

    constructor(
        @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService) private assetLibraryDeviceClient: DevicesService,
        @inject(ASSETLIBRARY_CLIENT_TYPES.GroupsService) private assetLibraryGroupClient: GroupsService,
        @inject(ASSETLIBRARY_CLIENT_TYPES.SearchService) private assetLibrarySearchClient: SearchService,
        @inject(THING_LIST_BUILDER_TYPES.IotFactory) iotFactory: () => IoTClient) {
          this.iot = iotFactory();
        }


    public async categorizeAndListThings(targets:string[], assetLibraryQuery?:SearchRequestModel) : Promise<string[]> {
        logger.debug(`awsIotThingListBuilder categorizeAndListThings: targets:${targets}, assetLibraryQuery:${JSON.stringify(assetLibraryQuery)}`);
  
        const awsThings:string[]=[];
        const awsThingsGroups:string[]=[];
        const assetLibraryDevices:string[]=[];
        const assetLibraryGroups:string[]=[];
  
        // figure out the type of each target
        if (targets!==undefined) {
            for(const target of targets) {
                const targetType = this.getTargetType(target);
                switch (targetType) {
                    case TargetType.awsIotThing:
                      awsThings.push(target);
                        break;
                    case TargetType.awsIotGroup:
                      awsThingsGroups.push(target);
                        break;
                    case TargetType.cdfDevice:
                        assetLibraryDevices.push(target);
                        break;
                    case TargetType.cdfGroup:
                        assetLibraryGroups.push(target);
                        break;
                    default:
                }
            }
        }

        const response = await this.listThings(awsThings, awsThingsGroups, assetLibraryDevices, assetLibraryGroups, assetLibraryQuery);        
        logger.debug(`awsIotThingListBuilder listThings: exit:`);
        return response;
      }

    public async listThings(
        thingNames?:string[],thingGroupNames?:string[],
        assetLibraryDeviceIds?:string[],assetLibraryGroupPaths?:string[],assetLibraryQuery?:SearchRequestModel) : Promise<string[]> {

      logger.debug(`awsIotThingListBuilder listThings: thingNames:${JSON.stringify(thingNames)}, thingGroupNames:${JSON.stringify(thingGroupNames)}, assetLibraryDeviceIds:${JSON.stringify(assetLibraryDeviceIds)}, assetLibraryGroupPaths:${JSON.stringify(assetLibraryGroupPaths)}, assetLibraryQuery:${JSON.stringify(assetLibraryQuery)}`);

      const thingNamesOut:string[]=[];
      const assetLibraryGroupPathsIn:string[]=[];

      if (thingNames!==undefined) {
        thingNamesOut.push(...thingNames);
      }
      if (assetLibraryGroupPaths!==undefined) {
        assetLibraryGroupPathsIn.push(...assetLibraryGroupPaths);
      }

      // if we have an Asset Library query specified, retrieve all the asset library groups/devices it relates to
      if (assetLibraryQuery!==undefined) {
          let searchResults = await this.assetLibrarySearchClient.search(assetLibraryQuery);
          logger.silly(`awsIotThingListBuilder listThings: searchResults:${JSON.stringify(searchResults)}`);
          while ((searchResults.results?.length??0)>0) {
              for(const r of searchResults.results) {
                  if (this.isDevice(r)) {
                      const awsIotThingArn = (r as Device10Resource).awsIotThingArn;
                      if (awsIotThingArn!==undefined) {
                        thingNamesOut.push(awsIotThingArn);
                      }
                  } else {
                    assetLibraryGroupPathsIn.push((r as Group10Resource).groupPath);
                  }
              }
              // possibly paginated results?
              if (searchResults.pagination!==undefined) {
                  const offset = searchResults.pagination.offset;
                  const count = searchResults.pagination.count;
                  searchResults = await this.assetLibrarySearchClient.search(assetLibraryQuery, offset+count );
              } else {
                  searchResults.results=[];
              }
          }
      }

      // for Asset Library groups, we need to expand to retrieve the thing arn of all devices that are a member of the group
      if (assetLibraryGroupPathsIn.length>0) {
          logger.silly(`awsIotThingListBuilder listThings: expanding assetLibraryGroupPathsIn: ${JSON.stringify(assetLibraryGroupPathsIn)}`);
          for(const groupPath of assetLibraryGroupPathsIn) {
              let result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath);
              while (result?.results!==undefined) {
                  for(const device of result.results) {
                      if (device.awsIotThingArn) {
                        thingNamesOut.push(device.awsIotThingArn);
                      }
                  }
                  if (result.pagination===undefined) {
                      break;
                  }
                  const offset = result.pagination.offset + result.pagination.count;
                  result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath, undefined, undefined, offset, result.pagination.count);
              }
          }
      }

      // for Asset Library devices, we need to get its corresponding thing arn
      if (assetLibraryDeviceIds?.length>0) {
          logger.silly(`awsIotThingListBuilder listThings: expanding assetLibraryDeviceIds: ${JSON.stringify(assetLibraryDeviceIds)}`);
          // TODO: performance improvement, process in parallel
          const result = await this.assetLibraryDeviceClient.getDevicesByID(assetLibraryDeviceIds, false, ['awsIotThingArn'], []);
          for(const device of result.results) {
              if (device.awsIotThingArn) {
                thingNamesOut.push(device.awsIotThingArn);
              }
          }
      }

      // for aws iot thing groups we need to expand to retrieve the group members
      if (thingGroupNames?.length>0) {
        logger.silly(`awsIotThingListBuilder listThings: expanding thingGroupNames: ${JSON.stringify(thingGroupNames)}`);
        for(const thingGroup of thingGroupNames) {
          let r = await this.iot.send( new ListThingsInThingGroupCommand({thingGroupName: thingGroup}));
          while ((r.things?.length??0)>0) {
            thingNamesOut.push(...r.things) ;
            if (r.nextToken!==undefined) 
              r = await this.iot.send( new ListThingsInThingGroupCommand({thingGroupName: thingGroup, nextToken: r.nextToken}));
          }
        }
      }

      // one final step, make sure they're unique
      const response = [...new Set(thingNamesOut)];
      logger.debug(`awsIotThingListBuilder listThings: exit:${response}`);
      return response;
    }

    private getTargetType(target:string): TargetType {
      if (target===undefined) {
        return TargetType.unknown;
      }
      // arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/MyLightBulb
      if (target.startsWith('arn:aws:iot:')) {
          const elements = target.split(':');
          if (elements[5].startsWith('thing/')) {
              return TargetType.awsIotThing;
          } else if (elements[5].startsWith('thinggroup/')) {
              return TargetType.awsIotGroup;
          }
      } else {
          if (target.startsWith('/')) {
              return TargetType.cdfGroup;
          }
      }
      return TargetType.cdfDevice;
    }

    private isDevice(arg: unknown): arg is Device10Resource {
      return arg && arg['deviceId'] && typeof(arg['deviceId']) === 'string';
    }
}