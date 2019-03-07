import { CDFProvisioningTemplate } from '../templates/template.models';
import { CdfProvisioningParameters } from '../things.models';

export interface ProvisioningStepInput {
  template:CDFProvisioningTemplate;
  parameters:{[key:string]:string};
  cdfProvisioningParameters:CdfProvisioningParameters;
}

export interface ProvisioningStepOutput {
  parameters:{[key:string]:string};
  cdfProvisioningParameters:CdfProvisioningParameters;
}
