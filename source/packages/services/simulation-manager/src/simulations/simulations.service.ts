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
import ow from 'ow';
import { generate } from 'shortid';

import { TYPES } from '../di/types';
import { logger } from '../utils/logger';
import { SimulationsDao } from './simulations.dao';
import {
    CreateSimulationRequest,
    SimulationStatus,
    SimulationTaskOverride,
    TemplateProperties,
} from './simulations.model';

@injectable()
export class SimulationsService {
    private readonly _sns: AWS.SNS;
    private readonly _s3: AWS.S3;
    private readonly _s3Bucket: string;
    private readonly _s3Prefix: string;

    public constructor(
        @inject(TYPES.SimulationsDao) private _dao: SimulationsDao,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS
    ) {
        this._sns = snsFactory();
        this._s3 = s3Factory();
        this._s3Bucket = process.env.AWS_S3_BUCKET;
        this._s3Prefix = process.env.AWS_S3_PREFIX;
    }

    public async createSimulation(request: CreateSimulationRequest): Promise<string> {
        logger.debug(`simulations.service createSimulation: request:${JSON.stringify(request)}`);

        // validation
        ow(request, ow.object.nonEmpty);
        const { simulation, taskOverrides } = request;
        ow(simulation, ow.object.nonEmpty);
        ow(simulation.name, ow.string.nonEmpty);
        ow(simulation.deviceCount, ow.number.greaterThan(0));

        if (taskOverrides?.taskRoleArn) {
            // eslint-disable-next-line no-unsafe-optional-chaining
            const [_, roleName] = taskOverrides?.taskRoleArn.split('/');
            ow(roleName, ow.string.startsWith('cdf-simulation-launcher'));
        }

        simulation.id = generate();
        simulation.status = SimulationStatus.preparing;
        await this._dao.save(simulation);

        // TODO: run any configured setup tasks

        // launch any configured provisioning task asynchronously
        const task = simulation.tasks.provisioning;
        if (task) {
            const threadsPerInstance = Number(process.env.RUNNERS_THREADS);
            const numInstances = Math.ceil(task.threads.total / threadsPerInstance);
            const devicesPerInstance = Math.ceil(simulation.deviceCount / numInstances);
            const s3RootKey = `${this._s3Prefix}${simulation.id}/provisioning/`;
            const simulationPlanKey = `${s3RootKey}plan.jmx`;

            logger.debug(`simulations.service s3RootKey:${s3RootKey}`);
            logger.debug(`simulations.service simulationPlanKey:${simulationPlanKey}`);
            logger.debug(`simulations.service copySource:/${this._s3Bucket}/${task.plan}`);
            logger.debug(`simulations.service numInstances:${numInstances}`);
            logger.debug(`simulations.service devicesPerInstance:${devicesPerInstance}`);

            // copy the test plan

            await this._s3
                .copyObject({
                    CopySource: `/${this._s3Bucket}/${task.plan}`,
                    Bucket: this._s3Bucket,
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
                simulation: simulation,
                instance: {
                    id: 0,
                    devices: devicesPerInstance,
                    threads: threadsPerInstance,
                },
            };

            const template = fs.readFileSync(process.env.TEMPLATES_PROVISIONING, 'utf8');
            const compiledTemplate = handlebars.compile(template);

            for (let instanceId = 1; instanceId <= numInstances; instanceId++) {
                properties.instance.id = instanceId;
                const propertyFile = compiledTemplate(properties);

                const s3Key = `${s3RootKey}instances/${instanceId}/properties`;
                await this._s3
                    .putObject({
                        Bucket: this._s3Bucket,
                        Key: s3Key,
                        Body: propertyFile,
                    })
                    .promise();
            }

            // Launch provisioning tasks
            await this.launchRunner(simulation.id, numInstances, s3RootKey, taskOverrides);
            simulation.status = SimulationStatus.provisioning;
            await this._dao.save(simulation);
        }

        logger.debug(`simulations.service create: exit:${simulation.id}`);
        return simulation.id;
    }

    public async launchRunner(
        simulationId: string,
        instances: number,
        s3RootKey: string,
        taskOverrides?: SimulationTaskOverride
    ): Promise<void> {
        logger.debug(
            `simulations.service launchRunner: in: simulationId:${simulationId}, instances:${instances}, s3RootKey:${s3RootKey}`
        );

        ow(simulationId, ow.string.nonEmpty);
        ow(instances, ow.number.greaterThan(0));
        ow(s3RootKey, ow.string.nonEmpty);

        const topic: string = process.env.AWS_SNS_TOPICS_LAUNCH;

        const msg = {
            simulationId,
            instances,
            s3RootKey,
            taskOverrides,
        };

        const params: AWS.SNS.Types.PublishInput = {
            Subject: 'LaunchRunner',
            Message: JSON.stringify(msg),
            TopicArn: topic,
        };

        logger.debug(`simulations.service launchRunner: publishing:${JSON.stringify(params)}`);
        await this._sns.publish(params).promise();
        logger.debug('simulations.service launchRunner: exit:');
    }
}
