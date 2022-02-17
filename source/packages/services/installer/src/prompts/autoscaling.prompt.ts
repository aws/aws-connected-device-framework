import { Answers, ProvisionedConcurrencyModuleAttribues as ProvisionedConcurrencyModuleAttributes } from '../models/answers';
import { ModuleName } from '../models/modules';

export function enableAutoScaling(moduleName: ModuleName, answers: Answers): unknown {
    return {
        message: 'Deployed with a autoscaling?',
        type: 'confirm',
        name: `${moduleName}.enableAutoScaling`,
        default: (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)?.enableAutoScaling ?? false,
        askAnswered: true,
    };
}

export function provisionedConcurrentExecutions(moduleName: ModuleName, answers: Answers): unknown {
    return {
        message: 'The no. of desired concurrent executions to  provision.  Set to 0 to disable.',
        type: 'input',
        name: `${moduleName}.provisionedConcurrentExecutions`,
        default: (answers[moduleName] as ProvisionedConcurrencyModuleAttributes)?.provisionedConcurrentExecutions ?? 0,
        askAnswered: true,
        validate(answer: number) {
            if (answer < 0) {
                return `You must enter number larger than 0.`;
            }
            return true;
        },
    };
}
