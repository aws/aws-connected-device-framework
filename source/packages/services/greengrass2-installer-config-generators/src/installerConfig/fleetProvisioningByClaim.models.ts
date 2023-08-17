export interface FleetProvisioningByClaimConfig {
    /**
     * The path to the folder to use as the root for the AWS IoT Greengrass Core software.
     */
    rootPath: string;

    /**
     * The AWS Region that the fleet provisioning plugin uses to provision AWS resources.
     */
    awsRegion: string;

    /**
     * The AWS IoT data endpoint for your AWS account.
     */
    iotDataEndpoint: string;

    /**
     * The AWS IoT credentials endpoint for your AWS account.
     */
    iotCredentialEndpoint: string;

    /**
     * The AWS IoT role alias that points to a token exchange IAM role. The AWS IoT credentials provider assumes this role to allow the Greengrass core device to interact with AWS services.
     */
    iotRoleAlias: string;

    /**
     * The AWS IoT fleet provisioning template to use to provision AWS resources. This template must specify the following:
        - An AWS IoT thing resource. You can specify a list of existing thing groups to deploy components to each device when it comes online.
        - An AWS IoT policy resource. This resource can define one of the following properties:
            - The name of an existing AWS IoT policy. If you choose this option, the core devices that you create from this template use the same AWS IoT policy, and you can manage their permissions as a fleet.
            - An AWS IoT policy document. If you choose this option, each core device that you create from this template uses a unique AWS IoT policy, and you can manage permissions for each individual core device.
        - An AWS IoT certificate resource. This certificate resource must use the AWS::IoT::Certificate::Id parameter to attach the certificate to the core device. For more information, see Just-in-time provisioning in the AWS IoT Developer Guide.
        For more information, see Provisioning templates in the AWS IoT Core Developer Guide.
     */
    provisioningTemplate: string;

    /**
     * The path to the provisioning claim certificate for the provisioning template that you specify in provisioningTemplate. For more information, see CreateProvisioningClaim in the AWS IoT Core API Reference.
     */
    claimCertificatePath: string;

    /**
     * The path to the provisioning claim certificate private key for the provisioning template that you specify in provisioningTemplate. For more information, see CreateProvisioningClaim in the AWS IoT Core API Reference.
     */
    claimCertificatePrivateKeyPath: string;

    /**
     * The path to the Amazon root certificate authority (CA) certificate.
     */
    rootCaPath: string;

    /**
     * (Optional) The map of parameters to provide to the fleet provisioning template. For more information, see Provisioning templates' parameters section in the AWS IoT Core Developer Guide.
     */
    templateParameters?: {
        [key: string]: string;
    };

    /**
     * (Optional) The device identifier to use as the client ID when the fleet provisioning plugin creates an MQTT connection to AWS IoT.
        Default: A random UUID.
     */
    deviceId?: string;

    /**
     * (Optional) The port to use for MQTT connections.
        Default: 8883
     */
    mqttPort?: number;

    /**
     * (Optional) The URL of the proxy server in the format scheme://userinfo@host:port.
        - scheme – The scheme, which must be http.
        - userinfo – (Optional) The user name and password information. If you specify this information in the url, the Greengrass core device ignores the username and password fields.
        - host – The host name or IP address of the proxy server.
        - port – (Optional) The port number. If you don't specify the port, then the Greengrass core device uses the following default value:
            - http – 80
     */
    proxyUrl?: string;

    /**
     * (Optional) The user name that authenticates the proxy server.
     */
    proxyUserName?: string;

    /**
     * (Optional) The user name that authenticates the proxy server.
     */
    proxyPassword?: string;
}
