/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/

import { logger } from './utils/logger.util';
import {container} from './di/inversify.config';
import { TYPES } from './di/types';
import { DevicesService } from './devices/devices.service';
import { DeviceTaskSummary } from './devices/devices.models';
import { DeploymentsService, GreengrassDeploymentChangeEvent } from './deployments/deployments.service';
import config from 'config';

// log detected config
logger.info(`\nDetected config:\n${JSON.stringify(config.util.toObject())}\n`);

let devicesSvc:DevicesService;
let deploymentSvc:DeploymentsService;
let sqs:AWS.SQS;
let deploymentStatusQueue:string;

exports.handler = async (event: any, _context: any) => {
  logger.debug(`lambda_sqs_proxy handler: event: ${JSON.stringify(event)}`);

  // init
  if (devicesSvc===undefined) {
    devicesSvc = container.get(TYPES.DevicesService);
  }
  if (deploymentSvc===undefined) {
    deploymentSvc = container.get(TYPES.DeploymentsService);
  }
  if (sqs===undefined) {
    const sqsFactory:() => AWS.SQS = container.get(TYPES.SQSFactory);
    sqs = sqsFactory();
  }
  if (deploymentStatusQueue===undefined) {
    deploymentStatusQueue = config.get('aws.sqs.deploymentStatus');
  }

  if (event.Records) {
    for (const r of event.Records) {

      if (r.eventSource === 'aws:sqs') {
        const messageType = r.messageAttributes?.messageType?.stringValue;
        const body = JSON.parse(r.body);

        if (messageType==='DeviceTaskSummary') {
          const taskInfo: DeviceTaskSummary = body;
          if (taskInfo.createdAt) {
            taskInfo.createdAt = new Date(taskInfo.createdAt);
          }
          if (taskInfo.updatedAt) {
            taskInfo.updatedAt = new Date(taskInfo.updatedAt);
          }
          await devicesSvc.associateDevicesWithGroup(taskInfo);

        } else if (messageType==='DeploymentTaskSummary') {
          await deploymentSvc.deploy( body.taskId);

        } else if (messageType==='BulkDeploymentStatus') {
          await deploymentSvc.updateBulkDeploymentStatus( body.taskId);

        } else if (body['source']==='aws.greengrass' && body['detail-type']==='Greengrass Deployment Status Change') {
          const d = body['detail'];
          const statusEvent:GreengrassDeploymentChangeEvent = {
            deploymentId: d['deployment-id'],
            deploymentType: d['deployment-type'],
            groupId: d['group-id'],
            status: d['status'],
            approximateFirstReceiveTimestamp: new Date(Number(r.messageAttributes.ApproximateFirstReceiveTimestamp ?? r.attributes.ApproximateFirstReceiveTimestamp))
          };
          try {
            await deploymentSvc.deploymentStatusChange(statusEvent);
          } catch (err) {
            // resubmit rather than waiting for the visibility timeout to expire
            await sqs.sendMessage({
              QueueUrl: deploymentStatusQueue,
              MessageBody: JSON.stringify(body),
              MessageAttributes: r.attributes,
              DelaySeconds: 5
            }).promise();
          }

        } else {
          logger.warn(`lambda_sqs_proxy handler: ignoring un-recognized sqs event`);
        }

      } else {
        logger.warn(`lambda_sqs_proxy handler: ignoring non-sqs events: ${JSON.stringify(r)}`);
        continue;
      }
    }
  }

  logger.debug(`lambda_sqs_proxy handler: exit:`);

};
