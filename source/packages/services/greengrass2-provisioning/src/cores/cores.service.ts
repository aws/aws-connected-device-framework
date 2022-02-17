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
import AdmZip from 'adm-zip';
import { inject, injectable } from 'inversify';
import ow from 'ow';
import pLimit from 'p-limit';

import {
    DeleteCoreDeviceCommand, GetCoreDeviceCommand, GetCoreDeviceCommandOutput, GreengrassV2Client,
    ListEffectiveDeploymentsCommand, ListEffectiveDeploymentsCommandOutput,
    ListInstalledComponentsCommand, ListInstalledComponentsCommandOutput
} from '@aws-sdk/client-greengrassv2';
import {
    CreateThingGroupCommand, DescribeThingCommand, DescribeThingGroupCommand, IoTClient
} from '@aws-sdk/client-iot';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import {
    PROVISIONING_CLIENT_TYPES, ProvisionThingRequest, ProvisionThingResponse, ThingsService
} from '@cdf/provisioning-client';

import { CoreTasksDao } from '../coreTasks/coreTasks.dao';
import { CoreTaskItem } from '../coreTasks/coreTasks.models';
import { TYPES } from '../di/types';
import { logger } from '../utils/logger.util';
import { S3Utils } from '../utils/s3.util';
import { CoreListPaginationKey, CoresDao } from './cores.dao';
import { ConfigGeneratorEvent, CoreItem, CoresEvent, CoresEventPayload, FailedCoreDeployment } from './cores.models';

import { CDFEventPublisher, EVENT_PUBLISHER_TYPES } from '@cdf/event-publisher'
import { DeploymentTaskListPaginationKey, DeploymentTasksDao } from '../deploymentTasks/deploymentTasks.dao';
import { Deployment } from '../deployments/deployments.models';

@injectable()
export class CoresService {

    private ggv2: GreengrassV2Client;
    private iot: IoTClient;
    private lambda: LambdaClient;

    public constructor(
        @inject(TYPES.S3Utils) private s3Utils: S3Utils,
        @inject(TYPES.CoreTasksDao) private coreTasksDao: CoreTasksDao,
        @inject(TYPES.CoresDao) private coresDao: CoresDao,
        @inject(TYPES.DeploymentTasksDao) private deploymentTasksDao: DeploymentTasksDao,
        @inject(PROVISIONING_CLIENT_TYPES.ThingsService) private thingsService: ThingsService,
        @inject(TYPES.IotFactory) iotFactory: () => IoTClient,
        @inject(TYPES.Greengrassv2Factory) ggv2Factory: () => GreengrassV2Client,
        @inject(TYPES.LambdaFactory) lambdaFactory: () => LambdaClient,
        @inject(EVENT_PUBLISHER_TYPES.CDFEventPublisher) private cdfEventPublisher: CDFEventPublisher,
    ) {
        this.iot = iotFactory();
        this.ggv2 = ggv2Factory();
        this.lambda = lambdaFactory();
    }

    public async associateTemplate(coreName: string, templateName: string, templateVersion: number, state: 'desired' | 'reported', deploymentStatus?: string, deploymentStatusMessage?: string): Promise<void> {
        logger.debug(`cores.service associateTemplate: in: coreName:${coreName}, templateName:${templateName}, templateVersion:${templateVersion}, state:${state}, deploymentStatus:${deploymentStatus}, deploymentStatusMessage:${deploymentStatusMessage}`);

        ow(coreName, ow.string.nonEmpty);
        ow(templateName, 'template name', ow.string.nonEmpty);
        ow(templateVersion, 'template version', ow.number.integer.greaterThan(0));
        ow(state, 'state', ow.string.oneOf(['reported', 'desired']));

        if (state === 'desired') {
            // desired state
            await this.coresDao.associateTemplate(coreName, templateName, templateVersion, state);
        } else if (deploymentStatus === 'SUCCESSFUL') {
            // reported state where deployment was successful
            await this.coresDao.associateTemplate(coreName, templateName, templateVersion, state, deploymentStatus, deploymentStatusMessage);
        } else {
            // reported state where deployment was unsuccessful, so instead save this as a failed desired state instead of reported as the reported installed template/version would not have changed
            const existing = await this.coresDao.get(coreName);
            await this.coresDao.associateTemplate(coreName, existing?.template?.desired?.name, existing?.template?.desired?.version, 'desired', deploymentStatus, deploymentStatusMessage);
        }

        logger.debug(`cores.service associateTemplate: exit`);

    }

    public async associateFailedDeploymentStarts(cores: FailedCoreDeployment[]): Promise<void> {
        logger.debug(`cores.service associateFailedDeploymentStarts: in: cores:${JSON.stringify(cores)}`);

        ow(cores, ow.array.minLength(1));
        for (const c of cores) {
            ow(c.name, 'name', ow.string.nonEmpty);
            ow(c.deploymentStatus, 'deploymentStatus', ow.string.nonEmpty);
            ow(c.deploymentStatusMessage, 'deploymentStatusMessage', ow.string.nonEmpty);
        }

        await this.coresDao.associateFailedDeploymentStarts(cores);

        logger.debug(`cores.service associateFailedDeploymentStarts: exit`);

    }

    public async get(name: string): Promise<CoreItem> {
        logger.debug(`cores.service get: in: name:${name}`);

        ow(name, ow.string.nonEmpty);

        const coreFuture = this.coresDao.get(name);
        const installedComponentsFuture = this.ggv2.send(
            new ListInstalledComponentsCommand({
                coreDeviceThingName: name
                // TODO: manage pagination of installed components
            }));
        const coreDeviceFuture = this.ggv2.send(
            new GetCoreDeviceCommand({
                coreDeviceThingName: name
            }));
        const effectiveDeploymentsFuture = this.ggv2.send(
            new ListEffectiveDeploymentsCommand({
                coreDeviceThingName: name
            }));

        const [core, components, coreDevice, effectiveDeployments] = await Promise.allSettled([coreFuture, installedComponentsFuture, coreDeviceFuture, effectiveDeploymentsFuture]);

        logger.silly(`cores.service get: components:${JSON.stringify(components)}`);
        logger.silly(`cores.service get: coreDevice:${JSON.stringify(coreDevice)}`);
        logger.silly(`cores.service get: effectiveDeployments:${JSON.stringify(effectiveDeployments)}`);

        const response = (core as PromiseFulfilledResult<CoreItem>).value;
        if (response === undefined) {
            return undefined;
        }
        response.device = {
            installedComponents: [],
            effectiveDeployments: []
        };

        if (components.status === 'fulfilled') {
            const ics = (components as PromiseFulfilledResult<ListInstalledComponentsCommandOutput>).value;
            if ((ics?.installedComponents?.length ?? 0) > 0) {
                for (const ic of ics.installedComponents) {
                    response.device.installedComponents.push({
                        name: ic.componentName,
                        version: ic.componentVersion
                        // TODO: determine whether installed component matches what is on template or not
                    })
                }
            }
        }

        if (coreDevice.status === 'fulfilled') {
            const cd = (coreDevice as PromiseFulfilledResult<GetCoreDeviceCommandOutput>).value;
            const rd = response.device;
            rd.coreVersion = cd.coreVersion;
            rd.platform = cd.platform;
            rd.architecture = cd.architecture;
            rd.status = cd.status;
            rd.lastStatusUpdateTimestamp = cd.lastStatusUpdateTimestamp;
            rd.tags = cd.tags;
        } else {
            response.device.status = 'UNKNOWN';
        }

        if (effectiveDeployments.status === 'fulfilled') {
            const eds = (effectiveDeployments as PromiseFulfilledResult<ListEffectiveDeploymentsCommandOutput>).value;
            if ((eds?.effectiveDeployments?.length ?? 0) > 0) {
                for (const ed of eds.effectiveDeployments) {
                    response.device.effectiveDeployments.push({
                        deploymentId: ed.deploymentId,
                        deploymentName: ed.deploymentName,
                        iotJobId: ed.iotJobId,
                        iotJobArn: ed.iotJobArn,
                        description: ed.description,
                        targetArn: ed.targetArn,
                        coreDeviceExecutionStatus: ed.coreDeviceExecutionStatus,
                        reason: ed.reason,
                        createdAt: ed.creationTimestamp,
                        updatedAt: ed.modifiedTimestamp
                    });
                }
            }
        }


        logger.debug(`cores.service get: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async createCores(task: CoreTaskItem, cores: CoreItem[]): Promise<CoreItem[]> {
        logger.debug(`cores.service createCores: in: task:${JSON.stringify(task)}, cores: ${JSON.stringify(cores)}`);

        // fail fast if invalid request
        ow(cores, ow.array.minLength(1));

        const futures: Promise<CoreItem>[] = [];
        const limit = pLimit(parseInt(process.env.PROMISES_CONCURRENCY));
        for (const c of cores) {
            futures.push(
                limit(async () => {
                    let processed: CoreItem;
                    try {
                        processed = await this.createCore(task, c);
                    } catch (e) {
                        logger.error(`cores.service createCores: error: ${e.name}: ${e.message}`);
                        processed = {
                            ...c,
                            taskStatus: 'Failure',
                            statusMessage: e.message,
                            createdAt: new Date(),
                            updatedAt: new Date()
                        }
                    }
                    return processed;
                })
            );
        }

        const results = await Promise.all(futures);
        logger.debug(`cores.service createCores: exit: ${JSON.stringify(results)}`);
        return results;
    }

    public async createCore(task: CoreTaskItem, request: CoreItem): Promise<CoreItem> {
        logger.debug(`cores.service createCore: in: task:${JSON.stringify(task)}, request:${JSON.stringify(request)}`);

        // fail fast if invalid request
        ow(request?.name, 'core name', ow.string.nonEmpty);
        ow(request?.provisioningTemplate, 'core provisioning template', ow.string.nonEmpty);

        // save as in progress
        const core: CoreItem = {
            ...request,
            taskStatus: 'InProgress',
            createdAt: new Date(),
            updatedAt: new Date()
        }
        await this.coreTasksDao.saveTaskDetail(task.id, core);

        // determine if core is already registered with ggv2
        let coreAlreadyExists = true;
        try {
            await this.ggv2.send(new GetCoreDeviceCommand({
                coreDeviceThingName: core.name
            }));
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                coreAlreadyExists = false;
            }
        }

        if (coreAlreadyExists) {
            logger.warn(`cores.service createCore: core: ${core.name} already registered with GGv2 as a core device`);
            core.taskStatus = 'Success';
            core.statusMessage = 'Core device already registered';
            core.updatedAt = new Date();
        } else {
            const futures: Promise<any>[] = [
                this.createThingGroupIfNotExist(core.name),
                this.createThingIfNotExist(core)
            ];
            await Promise.all(futures);
        }

        // create greengrass core config artifact
        if (core.taskStatus === 'InProgress') {
            await this.createCoreInstallerConfig(task, core);
        }

        // if we reach here and still in-progress, we have successfully finished creating the core device
        if (core.taskStatus === 'InProgress') {
            core.taskStatus = 'Success';
            core.updatedAt = new Date();
            await this.cdfEventPublisher.emitEvent<CoresEventPayload>({ name: CoresEvent, payload: { name: core.name, taskId: task.id, operation: 'create', status: 'success' } })
        }

        if (core.taskStatus === 'Failure') {
            await this.cdfEventPublisher.emitEvent<CoresEventPayload>({ name: CoresEvent, payload: { name: core.name, taskId: task.id, operation: 'create', status: 'failed', errorMessage: core.statusMessage } })
        }

        // save final state
        await this.coreTasksDao.saveTaskDetail(task.id, core);

        logger.debug(`cores.service createCore: exit: ${JSON.stringify(core)}`);
        return core;

    }

    /**
     * Determine if a thing has already been registered to represent this core. If not, provison it.
     * @param core
     */
    private async createThingIfNotExist(core: CoreItem): Promise<void> {
        logger.debug(`cores.service: createThingIfNotExist: in: core:${JSON.stringify(core)}`);
        let thingExists = true;
        try {
            await this.iot.send(new DescribeThingCommand({
                thingName: core.name
            }));
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                thingExists = false;
            }
        }
        if (!thingExists) {
            logger.debug(`cores.service createThingIfNotExist: provisioning thing for core: ${core.name}`);
            let res: ProvisionThingResponse;
            try {
                const req: ProvisionThingRequest = {
                    provisioningTemplateId: core.provisioningTemplate,
                    parameters: core.provisioningParameters,
                    cdfProvisioningParameters: core.cdfProvisioningParameters
                };
                logger.silly(`cores.service createThingIfNotExist: provisioning: req:${JSON.stringify(req)}`);
                res = await this.thingsService.provisionThing(req);
                logger.silly(`cores.service createThingIfNotExist: provisioning: res:${JSON.stringify(res)}`);
            } catch (err) {
                logger.error(`cores.service createThingIfNotExist: provisioning: err:${err}`);
                core.taskStatus = 'Failure';
                core.statusMessage = `Failed provisioning: ${err}`;
            }

            // if CDF has created certificates on behalf of the device, we need to store these for later retrieval by the device
            if (res?.certificatePem !== undefined) {
                try {
                    const [bucket, key] = await this.uploadCerts(core.name, res.certificatePem, res.privateKey);
                    if (!core.artifacts) {
                        core.artifacts = {};
                    }
                    core.artifacts.certs = {
                        bucket,
                        key,
                        createdAt: new Date()
                    };
                } catch (err) {
                    logger.error(`cores.service createThingIfNotExist: failed uploading certs:  err:${err}`);
                    core.taskStatus = 'Failure';
                    core.statusMessage = `Failed uploading certs: ${err}`;
                }
            }
        } else {
            core.taskStatus = 'Success';
            core.statusMessage = 'Core device thing already provisioned';
        }
        core.updatedAt = new Date();
        logger.debug(`cores.service: createThingIfNotExist: exit:`);
    }

    /**
     * Determine if a thing group has already been registered to represent this core. If not, create it.
     * @param coreName
     */
    private async createThingGroupIfNotExist(coreName: string): Promise<void> {
        logger.debug(`cores.service: createThingGroupIfNotExist: in: coreName:${coreName}`);

        let thingGroupExists = true;
        try {
            await this.iot.send(new DescribeThingGroupCommand({
                thingGroupName: coreName
            }));
        } catch (e) {
            if (e.name === 'ResourceNotFoundException') {
                thingGroupExists = false;
            }
        }
        if (!thingGroupExists) {
            logger.debug(`cores.service createThingGroupIfNotExist: creating thing group for core: ${coreName}`);
            await this.iot.send(new CreateThingGroupCommand({
                thingGroupName: coreName,
                thingGroupProperties: {
                    thingGroupDescription: `Greengrass V2 thing group for core ${coreName}`
                }
            }));
        }
        logger.debug(`cores.service: createThingGroupIfNotExist: exit:`);
    }

    /**
     * Create installer config
     * @param core
     */
    private async createCoreInstallerConfig(task: CoreTaskItem, core: CoreItem): Promise<void> {
        logger.debug(`cores.service: createCoreInstallerConfig: in: task:${JSON.stringify(task)} core:${JSON.stringify(core)}`);

        if (core?.configFileGenerator === undefined) {
            // nothing to generate
            return;
        }

        const e = process.env.INSTALLER_CONFIG_GENERATORS;
        logger.debug(`cores.service: createCoreInstallerConfig: config:${e}`);
        const generators = JSON.parse(e)
        const generator = generators[core.configFileGenerator];
        if ((generator?.length ?? 0) === 0) {
            logger.error(`cores.service createCoreInstallerConfig: unrecognized generator alias:${core.configFileGenerator}`);
            core.taskStatus = 'Failure';
            core.statusMessage = `Unrecognized generator alias: ${core.configFileGenerator}`;
            return;
        }

        const payload: ConfigGeneratorEvent = {
            version: task.coreVersion,
            coreDeviceName: core.name,
            provisioningTemplate: core.provisioningTemplate,
            templateParameters: core.provisioningParameters,
            cdfProvisioningParameters: core.cdfProvisioningParameters,
        }

        let config: string;
        try {
            const r = await this.lambda.send(new InvokeCommand({
                FunctionName: generator,
                Payload: Buffer.from(JSON.stringify(payload)),
                InvocationType: 'RequestResponse'
            }));
            const asciiDecoder = new TextDecoder('ascii');
            config = JSON.parse(asciiDecoder.decode(r?.Payload)).config;
            logger.silly(`cores.service createCoreInstallerConfig: config ${config}`);
        } catch (err) {
            logger.error(`cores.service createCoreInstallerConfig: failed creating config: err:${err}`);
            core.taskStatus = 'Failure';
            core.statusMessage = `Failed creating config: ${err}`;
            return;
        }

        // upload config to S3 for later retrieval by the device
        const bucket = process.env.AWS_S3_ARTIFACTS_BUCKET;
        const prefix = process.env.AWS_S3_ARTIFACTS_PREFIX;
        const s3Key = `${prefix}${core.name}/${core.name}/installerConfig.yml`;
        try {
            await this.s3Utils.uploadStreamToS3(bucket, s3Key, config);

            if (!core.artifacts) {
                core.artifacts = {};
            }
            core.artifacts.config = {
                bucket: bucket,
                key: s3Key,
                createdAt: new Date()
            };
        } catch (err) {
            logger.error(`cores.service createCoreInstallerConfig: failed uploading config:  err:${err}`);
            core.taskStatus = 'Failure';
            core.statusMessage = `Failed uploading certs: ${err}`;
            return;
        }

        core.updatedAt = new Date();
        logger.debug(`cores.service: createCoreInstallerConfig: exit:`);
    }

    private async uploadCerts(coreName: string, certificate: string, privateKey?: string): Promise<[string, string]> {
        logger.debug(`cores.service: uploadCerts: in: coreName:${coreName}`);

        const zip = new AdmZip();
        zip.addFile('certs/', Buffer.from(''));
        zip.addFile(`certs/cert.pem`, Buffer.from(certificate));

        if (privateKey) {
            zip.addFile(`certs/private.key`, Buffer.from(privateKey));
        }

        const bucket = process.env.AWS_S3_ARTIFACTS_BUCKET;
        const prefix = process.env.AWS_S3_ARTIFACTS_PREFIX;

        const s3Key = `${prefix}${coreName}/${coreName}/certs.zip`;
        await this.s3Utils.uploadStreamToS3(bucket, s3Key, zip.toBuffer());

        const response: [string, string] = [bucket, s3Key];
        logger.debug(`cores.service: uploadCerts: exit: ${JSON.stringify(response)}`);
        return response;
    }

    public async deleteCore(task: CoreTaskItem, name: string, deprovisionCore: boolean): Promise<CoreItem> {
        logger.debug(`cores.service deleteCore: in: name:${name}, deprovisionCore:${deprovisionCore}`);

        // fail fast if invalid request
        ow(name, 'core name', ow.string.nonEmpty);

        // get core
        const core = await this.coresDao.get(name);
        if (!core) {
            throw new Error(`CORE_NOT_FOUND`);
        }

        core.taskStatus = 'InProgress'
        core.createdAt = new Date()
        core.updatedAt = new Date()

        await this.coreTasksDao.saveTaskDetail(task.id, core);

        try {
            await this.ggv2.send(new DeleteCoreDeviceCommand({ coreDeviceThingName: name }));
        } catch (e) {
            logger.error(`cores.service deleteCore: unregistering core failed: ${e}`);
        }

        // if requested, deprovision the core device
        if (deprovisionCore) {
            try {
                await this.thingsService.deleteThing(name);
            } catch (e) {
                core.taskStatus = 'Failure';
                core.statusMessage = `Core cannot be removed from IoT service`;
                logger.error(`cores.service deleteCore: deleting core thing failed: ${e}`);
            }
        }

        // remove the core from this service
        try {
            await this.coresDao.delete(name);
        } catch (e) {
            core.taskStatus = 'Failure';
            core.statusMessage = `Core cannot be removed from asset library`;
            logger.error(`cores.service deleteCore: deleting core daat failed: ${e}`);
        }


        if (core.taskStatus === 'InProgress') {
            core.taskStatus = 'Success';
            core.updatedAt = new Date();
            await this.cdfEventPublisher.emitEvent<CoresEventPayload>({ name: CoresEvent, payload: { name, taskId: task.id, operation: 'delete', status: 'success' } })
        }

        if (core.taskStatus === 'Failure') {
            await this.cdfEventPublisher.emitEvent<CoresEventPayload>({ name: CoresEvent, payload: { name, taskId: task.id, operation: 'delete', status: 'failed', errorMessage: core.statusMessage } })
        }

        // save final state
        await this.coreTasksDao.saveTaskDetail(task.id, core);

        logger.debug(`cores.service deleteCore: exit:`);

        return core
    }

    public async list(templateName: string, templateVersion: number, failedOnly: boolean, count?: number, exclusiveStart?: CoreListPaginationKey): Promise<[CoreItem[], CoreListPaginationKey]> {
        logger.debug(`cores.service list: in: templateName:${templateName}, templateVersion:${templateVersion}, failedOnly:${failedOnly}, count:${count}, exclusiveStart:${JSON.stringify(exclusiveStart)}`);

        if (count) {
            count = Number(count);
        }
        if (templateVersion) {
            templateVersion = Number(templateVersion);
        }
        const result = await this.coresDao.list(templateName, templateVersion, failedOnly, count, exclusiveStart);

        logger.debug(`cores.service list: exit: ${JSON.stringify(result)}`);
        return result;
    }


    public async listDeploymentsByCore(coreName: string, count?: number, exclusiveStart?: DeploymentTaskListPaginationKey): Promise<[Deployment[], DeploymentTaskListPaginationKey]> {
        logger.debug(`cores.service listDeploymentsByCore: in: coreName:${coreName}, count:${count}, exclusiveStart:${JSON.stringify(exclusiveStart)}`);

        if (count) {
            count = Number(count);
        }

        const result = await this.deploymentTasksDao.listDeploymentsByCore(coreName, count, exclusiveStart);

        logger.debug(`cores.service listDeploymentsByCore: exit: ${JSON.stringify(result)}`);
        return result;
    }
}
