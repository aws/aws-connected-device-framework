import { ProvisioningStepInput, ProvisioningStepOutput } from './provisioningstep.model';

export interface ProvisioningStepProcessor {
  process(stepInput:ProvisioningStepInput):Promise<ProvisioningStepOutput>;
}
