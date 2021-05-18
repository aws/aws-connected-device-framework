/*-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
#
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------*/
export const GREENGRASS_DEPLOYMENT_CLIENT_TYPES = {

    DeploymentService: Symbol.for('GreengrassDeploymentClient_DeploymentService'),
    ActivationService: Symbol.for('GreengrassDeploymentClient_ActivationService'),
    TemplatesService: Symbol.for('GreengrassDeploymentClient_TemplatesService'),

    RestClient: Symbol.for('GreengrassDeploymentClient_RestClient'),
    RestClientFactory: Symbol.for('Factory<GreengrassDeploymentClient_RestClient>')

};
