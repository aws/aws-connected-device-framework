export interface TemplateUsage {
    templates: {
        [templateName:string]: {
            latestVersion: number;
            versions: {
                [templateVersion:number]: {
                    desiredInUse: number;
                    reportedInUse: number;
                    lastDeploymentSuccess: number;
                    lastDeploymentFailed: number;
                    lastDeploymentInProgress: number;
                };
            };
        };      
    };
}
