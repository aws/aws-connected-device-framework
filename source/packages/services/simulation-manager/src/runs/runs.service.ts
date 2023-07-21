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
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import { inject, injectable } from 'inversify';
import { parseAsync } from 'json2csv';
import ow from 'ow';
import * as ps from 'pick-some';
import { generate } from 'shortid';

import { TYPES } from '../di/types';
import { SimulationsDao } from '../simulations/simulations.dao';
import { TemplateProperties } from '../simulations/simulations.model';
import { SimulationsService } from '../simulations/simulations.service';
import { logger } from '../utils/logger';
import { RunsDao } from './runs.dao';
import { RunItem, RunStatus } from './runs.models';

export interface CreateRunRequest {
    item: RunItem;
}

@injectable()
export class RunsService {
    private readonly _s3: AWS.S3;
    private readonly _s3Bucket: string;
    private readonly _s3Prefix: string;

    constructor(
        @inject(TYPES.SimulationsDao) private _simulationDao: SimulationsDao,
        @inject(TYPES.SimulationsService) private _simulationService: SimulationsService,
        @inject(TYPES.RunsDao) private _runsDao: RunsDao,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3
    ) {
        this._s3 = s3Factory();
        this._s3Bucket = process.env.AWS_S3_BUCKET;
        this._s3Prefix = process.env.AWS_S3_PREFIX;
    }

    public async createRun(request: CreateRunRequest): Promise<string> {
        logger.info(`runs.service createRun: request:${JSON.stringify(request)}`);

        // validation
        ow(request, ow.object.nonEmpty);
        const run: RunItem = request.item;
        ow(run, ow.object.nonEmpty);
        ow(run.deviceCount, ow.number.greaterThan(0));

        const simulation = await this._simulationDao.get(run.simulationId);

        run.id = generate();
        run.status = RunStatus.preparing;
        await this._runsDao.save(run);

        // TODO: validation - simulation available?
        // TODO: validation - run not already in progress?
        // TODO: validation - no. devices < total available?

        // data generation - retrieve last known location
        let simulationDevices = await this._runsDao.listDeviceState(run.simulationId);

        // data generation - choose devices from pool
        const runDevices = ps.pickSome(run.deviceCount, { unique: true }, simulationDevices);
        simulationDevices = null;

        // chunk the devices into how many instances we need to run the simulation
        const task = simulation.tasks.simulation;
        const runnersThreads = Number(process.env.RUNNERS_THREADS);
        const threadsPerInstance: number = Math.min(runnersThreads, run.deviceCount);
        const numInstances = Math.ceil(task.threads.total / threadsPerInstance);
        const devicesPerInstance = Math.ceil(run.deviceCount / numInstances);
        const s3RootKey = `${this._s3Prefix}${simulation.id}/runs/${run.id}/`;

        logger.info(
            `runs.service createRun: task:${task}, threadsPerInstance: ${threadsPerInstance}, numInstances: ${numInstances}, devicesPerInstance: ${devicesPerInstance}, runDeviceCount: ${run.deviceCount}, runnersThreads: ${runnersThreads}`
        );

        // copy the test plan
        const simulationPlanKey = `${s3RootKey}plan.jmx`;
        await this._s3
            .copyObject({
                Bucket: this._s3Bucket,
                CopySource: `/${this._s3Bucket}/${task.plan}`,
                Key: simulationPlanKey,
            })
            .promise();

        // prepare the config for each instance
        const properties: TemplateProperties = {
            config: {
                aws: {
                    iot: {
                        host: process.env.AWS_IOT_HOST,
                    },
                    region: process.env.AWS_REGION,
                    s3: {
                        bucket: process.env.AWS_S3_BUCKET,
                        prefix: process.env.AWS_S3_PREFIX,
                    },
                },
                cdf: {
                    assetlibrary: {
                        mimetype: process.env.ASSETLIBRARY_MIMETYPE,
                        apiFunctionName: process.env.ASSETLIBRARY_API_FUNCTION_NAME,
                    },
                },
                runners: {
                    dataDir: process.env.RUNNERS_DATADIR,
                },
            },
            simulation,
            run,
            instance: {
                id: 0,
                devices: devicesPerInstance,
                threads: threadsPerInstance,
            },
        };
        const template = fs.readFileSync(process.env.TEMPLATES_SIMULATION, 'utf8');
        const compiledTemplate = handlebars.compile(template);

        for (let instanceId = 1; instanceId <= numInstances; instanceId++) {
            properties.instance.id = instanceId;
            const propertyFile = compiledTemplate(properties);

            // for each instance, uploads its config
            let s3Key = `${s3RootKey}instances/${instanceId}/properties`;
            await this._s3
                .putObject({ Bucket: this._s3Bucket, Key: s3Key, Body: propertyFile })
                .promise();

            // for each instance, prepare and upload the last known device state for the devices to simulate
            const fields = Object.keys(runDevices[0]);
            const startIndex = (instanceId - 1) * devicesPerInstance;
            const endIndex = startIndex + devicesPerInstance;
            const instanceDevices = runDevices.splice(startIndex, endIndex);
            const dataAsCsv = await parseAsync(instanceDevices, { fields });
            s3Key = `${s3RootKey}instances/${instanceId}/deviceState.csv`;
            await this._s3
                .putObject({ Bucket: this._s3Bucket, Key: s3Key, Body: dataAsCsv })
                .promise();
        }

        // launch the simulation
        await this._simulationService.launchRunner(simulation.id, numInstances, s3RootKey);

        logger.info(`runs.service createRun: exit:${run.id}`);
        return run.id;
    }

    public async deleteRun(request: CreateRunRequest): Promise<string> {
        logger.info(`runs.service deleteRun: request:${JSON.stringify(request)}`);

        // TODO: simulation - tear down on finished

        return 'todo';
    }
}
