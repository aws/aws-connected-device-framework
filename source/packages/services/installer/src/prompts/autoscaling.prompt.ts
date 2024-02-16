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
import { Question } from 'inquirer';
import {
    Answers,
    NeptuneScalingAttributes,
    ProvisionedConcurrencyModuleAttribues as ProvisionedConcurrencyModuleAttributes
} from '../models/answers';
import { ModuleName } from '../models/modules';

export function enableAutoScaling(moduleName: ModuleName, answers: Answers): Question {
    return {
        message: 'Deployed with a autoscaling?',
        type: 'confirm',
        name: `${moduleName}.enableAutoScaling`,
        default:
            (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)?.enableAutoScaling ??
            false,
        askAnswered: true,
    };
}

export function provisionedConcurrentExecutions(
    moduleName: ModuleName,
    answers: Answers
): Question {
    return {
        message: 'The no. of desired concurrent executions to  provision.  Set to 0 to disable.',
        type: 'input',
        name: `${moduleName}.provisionedConcurrentExecutions`,
        default:
            (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)
                ?.provisionedConcurrentExecutions ?? 0,
        askAnswered: true,
        validate(answer: number) {
            if (answer < 0) {
                return `You must enter number larger than 0.`;
            }
            return true;
        },
    };
}

export function enableNeptuneAutoScaling(moduleName: ModuleName, answers: Answers): Question {
  return {
    message: 'Deployed with a autoscaling for Neptune?',
    type: 'confirm',
    name: `${moduleName}.enableNeptuneAutoScaling`,
    default: (answers[moduleName] as NeptuneScalingAttributes)?.enableNeptuneAutoScaling ?? false,
    askAnswered: true,
  };
}


export function maxNeptuneReadReplicas(moduleName: ModuleName, answers: Answers): Question {
  return {
    message: 'The max number of read replicas when neptune is scaled. Default is 1',
    type: 'input',
    name: `${moduleName}.maxNeptuneReadReplicas`,
    default: (answers[moduleName] as NeptuneScalingAttributes)?.maxNeptuneReadReplicaCapacity ?? 1,
    askAnswered: true,
    when(answers: Answers) {
      return answers.assetLibrary?.enableNeptuneAutoScaling
    },
    validate(answer: number) {
      if (answer < 0) {
        return `You must enter number 0 or larger than 0.`;
      }
      return true;
    },
  };
}

export function minNeptuneReadReplicas(moduleName: ModuleName, answers: Answers): Question {
  return {
    message:  'The minimum number of read replicas when neptune is scaled. Default is 1',
    type: 'input',
    name: `${moduleName}.minNeptuneReadReplicas`,
    default: (answers[moduleName] as NeptuneScalingAttributes)?.minNeptuneReadReplicaCapacity ?? 1,
    askAnswered: true,
    when(answers: Answers) {
      return answers.assetLibrary?.enableNeptuneAutoScaling
    },
    validate(answer: number) {
      if (answer < 0) {
        return `You must enter number 0 or larger than 0.`;
      }
      return true;
    },
  };
}

export function neptuneTargetUtilization(moduleName: ModuleName, answers: Answers): Question {
  return {
    message:  'The target CPU utilization for Neptune to auto-scale read replica?',
    type: 'input',
    name: `${moduleName}.neptuneTargetUtilization`,
    default: (answers[moduleName] as NeptuneScalingAttributes)?.neptuneTargetUtilization ?? 75,
    askAnswered: true,
    when(answers: Answers) {
      return answers.assetLibrary?.enableNeptuneAutoScaling
    },
    validate(answer: number) {
      if (answer <= 0) {
        return `You must enter number 1 or larger .`;
      }
      return true;
    },
  };
}