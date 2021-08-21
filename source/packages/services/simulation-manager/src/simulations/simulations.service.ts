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
import { injectable, inject } from 'inversify';
import ow from 'ow';
import { logger } from '../utils/logger';
import { SimulationItem, SimulationStatus, TemplateProperties } from './simulations.model';
import { TYPES } from '../di/types';
import { SimulationsDao } from './simulations.dao';
import config from 'config';
import * as handlebars from 'handlebars';
import {generate} from 'shortid';
import * as fs from 'fs';

export interface CreateSimulationRequest {
    item: SimulationItem;
}

@injectable()
export class SimulationsService {

    private readonly _sns: AWS.SNS;
    private readonly _s3 : AWS.S3;
    private readonly _s3Bucket:string;
    private readonly _s3Prefix:string;

    public constructor(
        @inject(TYPES.SimulationsDao) private _dao: SimulationsDao,
        @inject(TYPES.S3Factory) s3Factory: () => AWS.S3,
        @inject(TYPES.SNSFactory) snsFactory: () => AWS.SNS) {
            this._sns  =  snsFactory();
            this._s3  =  s3Factory();
            this._s3Bucket = config.get('aws.s3.bucket');
            this._s3Prefix = config.get('aws.s3.prefix');
    }

    public async createSimulation(request: CreateSimulationRequest): Promise<string> {
        logger.debug(`simulations.service createSimulation: request:${JSON.stringify(request)}`);

        // validation
        ow(request, ow.object.nonEmpty);
        const item:SimulationItem = request.item;
        ow(item, ow.object.nonEmpty);
        ow(item.name, ow.string.nonEmpty);
        ow(item.deviceCount, ow.number.greaterThan(0));

        item.id = generate();
        item.status = SimulationStatus.preparing;
        await this._dao.save(item);

        // TODO: run any configured setup tasks

        // launch any configured provisioning task asynchronously
        const task = item.tasks.provisioning;
        if (task) {
            const threadsPerInstance:number = config.get('runners.threads');
            const numInstances = Math.ceil(task.threads.total / threadsPerInstance);
            const devicesPerInstance = Math.ceil(item.deviceCount / numInstances);
            const s3RootKey = `${this._s3Prefix}${item.id}/provisioning/`;
            const simulationPlanKey = `${s3RootKey}plan.jmx`;

            logger.debug(`simulations.service s3RootKey:${s3RootKey}`);
            logger.debug(`simulations.service simulationPlanKey:${simulationPlanKey}`);
            logger.debug(`simulations.service copySource:/${this._s3Bucket}/${task.plan}`);
            logger.debug(`simulations.service numInstances:${numInstances}`);
            logger.debug(`simulations.service devicesPerInstance:${devicesPerInstance}`);

            // copy the test plan

            await this._s3.copyObject({
                Bucket: this._s3Bucket,
                CopySource: `/${this._s3Bucket}/${task.plan}`,
                Key: simulationPlanKey
            }).promise();

            // prepare the config for each instance
            const properties:TemplateProperties = {
                config: config.util.toObject(),
                simulation: item,
                instance: {
                    id: 0,
                    devices: devicesPerInstance,
                    threads: threadsPerInstance
                }
            };

            const template = fs.readFileSync(config.get('templates.provisioning'),'utf8');
            const compiledTemplate = handlebars.compile(template);

            for (let instanceId=1; instanceId<=numInstances; instanceId++) {
                properties.instance.id=instanceId;
                const propertyFile = compiledTemplate(properties);

                const s3Key = `${s3RootKey}instances/${instanceId}/properties`;
                await this._s3.putObject({
                    Bucket: this._s3Bucket,
                    Key: s3Key,
                    Body: propertyFile
                }).promise();
            }

            // Launch provisioning tasks
            await this.launchRunner(item.id, numInstances, s3RootKey);
            item.status = SimulationStatus.provisioning;
            await this._dao.save(item);
        }

        logger.debug(`simulations.service create: exit:${item.id}`);
        return item.id;

    }

    public async launchRunner(simulationId:string, instances:number, s3RootKey:string): Promise<void> {
        logger.debug(`simulations.service launchRunner: in: simulationId:${simulationId}, instances:${instances}, s3RootKey:${s3RootKey}`);

        ow(simulationId, ow.string.nonEmpty);
        ow(instances, ow.number.greaterThan(0));
        ow(s3RootKey, ow.string.nonEmpty);

        const topic:string = config.get('aws.sns.topics.launch');

        const msg = {
            simulationId, instances, s3RootKey
        };

        const params:AWS.SNS.Types.PublishInput = {
            Subject: 'LaunchRunner',
            Message: JSON.stringify(msg),
            TopicArn: topic
        };

        logger.debug(`simulations.service launchRunner: publishing:${JSON.stringify(params)}`);
        await this._sns.publish(params).promise();
        logger.debug('simulations.service launchRunner: exit:');

    }

}
