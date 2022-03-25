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

import {
    ASSETLIBRARY_CLIENT_TYPES, Device10Resource, DevicesService, Group10Resource, GroupsService,
    SearchRequestModel, SearchService
} from '@cdf/assetlibrary-client';

import { THING_LIST_BUILDER_TYPES } from './di/types';
import { ListThingsRequest, ListThingsResponse, TargetType } from './models';
import { logger } from './utils/logger.util';
import ow from 'ow';
import { IoTClient, ListThingsInThingGroupCommand } from '@aws-sdk/client-iot';

@injectable()
export class AwsIotThingListBuilder {

  private iot: IoTClient;

  constructor(
    @inject("aws.region") private readonly awsRegion: string,
    @inject(ASSETLIBRARY_CLIENT_TYPES.DevicesService) private assetLibraryDeviceClient: DevicesService,
    @inject(ASSETLIBRARY_CLIENT_TYPES.GroupsService) private assetLibraryGroupClient: GroupsService,
    @inject(ASSETLIBRARY_CLIENT_TYPES.SearchService) private assetLibrarySearchClient: SearchService,
    @inject(THING_LIST_BUILDER_TYPES.IotFactory) iotFactory: () => IoTClient) {
    this.iot = iotFactory();
  }


  public async categorizeAndListThings(targets: string[], assetLibraryQuery?: SearchRequestModel): Promise<ListThingsResponse> {
    logger.debug(`awsIotThingListBuilder categorizeAndListThings: targets:${targets}, assetLibraryQuery:${JSON.stringify(assetLibraryQuery)}`);

    const req:ListThingsRequest = {
      thingNames: [],
      thingGroupNames: [],
      assetLibraryDeviceIds: [],
      assetLibraryGroupPaths: [],
      assetLibraryQuery
    }

    const arnsOutOfRegion: string[] = [];

    // figure out the type of each target
    if (targets !== undefined) {
      for (const target of targets) {
        const targetType = this.getTargetType(target);
        switch (targetType) {
          case TargetType.awsIotThing:
            if (this.isInRegion(target)) {
              req.thingNames.push(this.getName(target));
            } else {
              arnsOutOfRegion.push(target);
            }
            break;
          case TargetType.awsIotGroup:
            if (this.isInRegion(target)) {
              req.thingGroupNames.push(this.getName(target));
            } else {
              arnsOutOfRegion.push(target);
            }
            break;
          case TargetType.cdfDevice:
            req.assetLibraryDeviceIds.push(target);
            break;
          case TargetType.cdfGroup:
            req.assetLibraryGroupPaths.push(target);
            break;
          default:
        }
      }
    }

    const response = await this.listThings(req);
    response.arnsOutOfRegion.push(...arnsOutOfRegion);
    response.arnsOutOfRegion = [...new Set(response.arnsOutOfRegion)];

    logger.debug(`awsIotThingListBuilder categorizeAndListThings: exit:`);
    return response;
  }

  public async listThings(req: ListThingsRequest): Promise<ListThingsResponse> {

    logger.debug(`awsIotThingListBuilder listThings: r:${JSON.stringify(req)}`);

    ow(req, ow.object.nonEmpty);

    const thingNamesResult: string[] = [];
    const arnsOutOfRegion: string[] = [];
    if ((req.thingNames?.length ?? 0) > 0) {
      thingNamesResult.push(...req.thingNames);
    }

    const assetLibraryGroupPathsToProcess: string[] = [];
    if (req.assetLibraryGroupPaths !== undefined) {
      assetLibraryGroupPathsToProcess.push(...req.assetLibraryGroupPaths);
    }

    // if we have an Asset Library query specified, retrieve all the asset library groups/devices it relates to
    if (req.assetLibraryQuery !== undefined) {
      logger.silly(`awsIotThingListBuilder listThings: processing assetLibraryQuery`);
      let searchResults = await this.assetLibrarySearchClient.search(req.assetLibraryQuery);
      logger.silly(`awsIotThingListBuilder listThings: searchResults:${JSON.stringify(searchResults)}`);
      while ((searchResults.results?.length ?? 0) > 0) {
        for (const r of searchResults.results) {
          if (this.isDevice(r)) {
            const awsIotThingArn = (r as Device10Resource).awsIotThingArn;
            if (awsIotThingArn !== undefined) {
              if (this.isInRegion(awsIotThingArn)) {
                thingNamesResult.push(this.getName(awsIotThingArn));
              } else {
                arnsOutOfRegion.push(awsIotThingArn);
              }
            }
          } else {
            assetLibraryGroupPathsToProcess.push((r as Group10Resource).groupPath);
          }
        }
        // possibly paginated results?
        if (searchResults.pagination !== undefined) {
          const offset = searchResults.pagination.offset;
          const count = searchResults.pagination.count;
          searchResults = await this.assetLibrarySearchClient.search(req.assetLibraryQuery, offset + count);
        } else {
          searchResults.results = [];
        }
      }
    }

    // for Asset Library groups, we need to expand to retrieve the thing arn of all devices that are a member of the group
    if (assetLibraryGroupPathsToProcess.length > 0) {
      logger.silly(`awsIotThingListBuilder listThings: expanding assetLibraryGroupPathsToProcess: ${JSON.stringify(assetLibraryGroupPathsToProcess)}`);
      for (const groupPath of assetLibraryGroupPathsToProcess) {
        let result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath);
        logger.silly(`awsIotThingListBuilder listThings: result: ${JSON.stringify(result)}`);
        while (result?.results !== undefined) {
          for (const device of result.results) {
            if (device.awsIotThingArn) {
              if (this.isInRegion(device.awsIotThingArn)) {
                thingNamesResult.push(this.getName(device.awsIotThingArn));
              } else {
                arnsOutOfRegion.push(device.awsIotThingArn);
              }
            }
          }
          if (result.pagination === undefined) {
            break;
          }
          const offset = result.pagination.offset + result.pagination.count;
          result = await this.assetLibraryGroupClient.listGroupMembersDevices(groupPath, undefined, undefined, offset, result.pagination.count);
        }
      }
    }

    // for Asset Library devices, we need to get its corresponding thing arn
    if ((req.assetLibraryDeviceIds?.length ?? 0) > 0) {
      logger.silly(`awsIotThingListBuilder listThings: expanding assetLibraryDeviceIds: ${JSON.stringify(req.assetLibraryDeviceIds)}`);
      // TODO: performance improvement, process in parallel
      const result = await this.assetLibraryDeviceClient.getDevicesByID(req.assetLibraryDeviceIds, false, ['awsIotThingArn'], []);
      logger.silly(`awsIotThingListBuilder listThings: result: ${JSON.stringify(result)}`);
      for (const device of result.results) {
        if (device.awsIotThingArn) {
          if (this.isInRegion(device.awsIotThingArn)) {
            thingNamesResult.push(this.getName(device.awsIotThingArn));
          } else {
            arnsOutOfRegion.push(device.awsIotThingArn);
          }
        }
      }
    }

    // for aws iot thing groups we need to expand to retrieve the group members
    if ((req.thingGroupNames?.length ?? 0) > 0) {
      logger.silly(`awsIotThingListBuilder listThings: expanding thingGroupNames: ${JSON.stringify(req.thingGroupNames)}`);
      for (const thingGroup of req.thingGroupNames) {
        let result = await this.iot.send( new ListThingsInThingGroupCommand({thingGroupName: thingGroup}));
        logger.silly(`awsIotThingListBuilder listThings: r: ${JSON.stringify(req)}`);
        while ((result.things?.length ?? 0) > 0) {
          thingNamesResult.push(...result.things);
          if (result.nextToken !== undefined && result.nextToken !== null) {
            result = await this.iot.send( new ListThingsInThingGroupCommand({thingGroupName: thingGroup, nextToken: result.nextToken}));
          } else {
            break;
          }
        }
      }
    }

    // one final step, make sure they're unique
    const response:ListThingsResponse = {
      thingNames: [...new Set(thingNamesResult)],
      arnsOutOfRegion: [...new Set(arnsOutOfRegion)]
    };

    logger.debug(`awsIotThingListBuilder listThings: exit:${JSON.stringify(response)}`);
    return response;
  }

  private getTargetType(target: string): TargetType {
    if (target === undefined) {
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

  private isInRegion(arn: string): boolean {
    // arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/MyLightBulb
    const arnRegion = arn?.split(':')[3];
    return arnRegion === this.awsRegion;
  }

  private getName(arn: string): string {
    // arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/MyLightBulb
    return arn?.split(':')[6];
  }

  private isDevice(arg: unknown): arg is Device10Resource {
    return arg && arg['deviceId'] && typeof (arg['deviceId']) === 'string';
  }

}