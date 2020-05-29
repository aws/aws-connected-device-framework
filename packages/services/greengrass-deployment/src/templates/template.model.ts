
export interface DeploymentSource {
    type: DeploymentType;
    bucket: string;
    prefix: string;
}

export enum DeploymentType {
    AGENTLESS='agentless',
    AGENTBASED='agentbased',
}

export interface DeploymentTemplateModel {
    createdAt?: Date;
    description: string;
    enabled: boolean;
    envVars?: string[];
    name: string;
    options?: string[];
    source: DeploymentSource;
    type: DeploymentType;
    updatedAt?: Date;
    versionNo: number;

}

export interface DeploymentTemplateRequest {
    createdAt?: Date;
    description: string;
    enabled: boolean;
    envVars?: string[];
    name: string;
    options?: string[];
    source: DeploymentSource;
    type: DeploymentType;
    updatedAt?: Date;
    versionNo: number;
}

export class DeploymentTemplatesList {
    templates: DeploymentTemplateModel[] = [];
    pagination?: {
        offset:number|string;
        count: number;
    };
}
