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
export const TYPES = {
    Controller: Symbol.for('Controller'),

    HttpHeaderUtils: Symbol.for('HttpHeaderUtils'),

    SimulationsService: Symbol.for('SimulationsService'),
    SimulationsDao: Symbol.for('SimulationsDao'),

    RunsService: Symbol.for('RunsService'),
    RunsDao: Symbol.for('RunsDao'),

    SimulationStateFactory: Symbol.for('SimulationStateFactory'),
    InvalidSimulationAction: Symbol.for('InvalidSimulationAction'),
    CreateSimulationAction: Symbol.for('CreateSimulationAction'),
    SimulationDataGeneratedAction: Symbol.for('SimulationDataGeneratedAction'),
    SimulationProvisionAction: Symbol.for('SimulationProvisionAction'),

    RunStateFactory: Symbol.for('RunStateFactory'),
    InvalidRunAction: Symbol.for('InvalidRunAction'),

    DocumentClient: Symbol.for('DocumentClient'),
    DocumentClientFactory: Symbol.for('Factory<DocumentClient>'),

    SNS: Symbol.for('SNS'),
    SNSFactory: Symbol.for('Factory<SNS>'),

    S3: Symbol.for('S3'),
    S3Factory: Symbol.for('Factory<S3>'),
};
