/**
 * The Greengrass nucleus component (aws.greengrass.Nucleus) is a mandatory component and the minimum requirement to run the AWS IoT Greengrass Core software on a device. You can configure this component to customize and update your AWS IoT Greengrass Core software remotely. Deploy this component to configure settings such as proxy, device role, and AWS IoT thing configuration on your core devices.
 */
export interface GreengrassNucleusConfig {
    /**
     * The AWS IoT role alias that points to a token exchange IAM role. The AWS IoT credentials provider assumes this role to allow the Greengrass core device to interact with AWS services. When you run the AWS IoT Greengrass Core software with the --provision true option, the software provisions a role alias and sets its value in the nucleus component.
     */
    iotRoleAlias: string;

    /**
     * (Optional) The network proxy to use for all connections. For more information.
     */
    networkProxy?: {
        /**
         * (Optional) A comma-separated list of IP addresses or hostnames that are exempt from the proxy.
         */
        noProxyAddresses?: string[];

        /**
         * The proxy to which to connect.
         */
        proxy: {    
            /**
             * The URL of the proxy server in the format scheme://userinfo@host:port.

                    scheme – The scheme, which must be http.
                    userinfo – (Optional) The user name and password information. If you specify this information in the url, the Greengrass core device ignores the username and password fields.
                    host – The host name or IP address of the proxy server.
                    port – (Optional) The port number. If you don't specify the port, then the Greengrass core device uses the following default value:
                    http – 80

             */
            url: string;

            /**
             * (Optional) The user name that authenticates the proxy server.
             */
            username?: string;

            /**
             * (Optional) The password that authenticates the proxy server.
             */
            password?: string;
        }
    };

    /**
     * (Optional) The MQTT configuration for the Greengrass core device. For more information.
     */
    mqtt?: {
        /**
         * (Optional) The port to use for MQTT connections. 
         * Default: 8883.
         */
        port?: number;

        /**
         * (Optional) The amount of time in milliseconds between each PING message that the client sends to keep the MQTT connection alive.
         * Default: 60000 (60 seconds)
         */
        keepAliveTimeoutMs?: number;

        /**
         * (Optional) The amount of time in milliseconds that the client waits to receive a PINGACK message from the server. If the wait exceeds the timeout, the core device closes and reopens the MQTT connection.
         * Default: 30000 (30 seconds)
         */
        pingTimeoutMs?: number;

        /**
         * (Optional) The maximum number of unacknowledged MQTT QoS 1 messages that can be in flight at the same time.
            This feature is available for v2.1.0 and later of this component.
            Default: 5
            Valid range: Maximum value of 100
         */
        maxInFlightPublishes?: number;

        /**
         * (Optional) The maximum size of an MQTT message. If a message exceeds this size, the Greengrass nucleus rejects the message with an error.
            This feature is available for v2.1.0 and later of this component.
            Default: 131072 (128 KB)
            Valid range: Maximum value of 2621440 (2.5 MB)
         */
        maxMessageSizeInBytes?: number;

        /**
         * (Optional) The maximum number of times to retry a message that fails to publish. You can specify -1 to retry unlimited times.
            This feature is available for v2.1.0 and later of this component.
            Default: 100
         */
        maxPublishRetry?: number;

        /**
         * (Optional) The MQTT spooler configuration for the Greengrass core device.
         */
        spooler?: {
            /**
             * (Optional) The maximum size of the cache where the core device stores unprocessed MQTT messages in memory. If the cache is full, the core device discards the oldest messages to add new messages.
                Default: 2621440 (2.5 MB)
             */
            maxSizeInBytes?: number;
            /**
             * (Optional) You can spool MQTT QoS 0 messages that the core device receives while its offline. If you set this option to true, the core device spools QoS 0 messages that it can't send while it's offline. If you set this option to false, the core device discards these messages. The core device always spools QoS 1 messages unless the spool is full.
                Default: false
             */
            keepQos0WhenOffline?: boolean;
        }
    }

    /**
     * (Optional) The JVM options to use to run the AWS IoT Greengrass Core software.
     */
    jvmOptions?: string;

    /**
     * The AWS IoT data endpoint for your AWS account.
     * When you run the AWS IoT Greengrass Core software with the --provision true option, the software gets your data and credentials endpoints from AWS IoT and sets them in the nucleus component.
     */
    iotDataEndpoint: string;

    /**
     * The AWS IoT credentials endpoint for your AWS account.
     * When you run the AWS IoT Greengrass Core software with the --provision true option, the software gets your data and credentials endpoints from AWS IoT and sets them in the nucleus component.
     */
    iotCredEndpoint: string;

    /**
     * This feature is available in v2.0.4 and later of this component.
        (Optional) The port to use for data plane connections. 
        Important: You must specify a port where the device can make outbound connections. If you specify a port that is blocked, the device won't be able to connect to AWS IoT Greengrass to receive deployments.
        Choose from the following options:
        - 443
        - 8443
        Default: 8443
     */
    greengrassDataPlanePort?: 443 | 8443;

    /**
     * The AWS Region to use.
     */
    awsRegion: string;

    /**
     * The system user and group to use to run components.
     */
    runWithDefault?: {
        /**
         * The name or ID of the system user and system group that the core device uses to run generic and Lambda components. Specify the user and group separated by a colon (:), where the group is optional. If you omit the group, the AWS IoT Greengrass Core software defaults to the primary group of the user that you specify. For example, you can specify ggc_user or ggc_user:ggc_group. For more information.
         * When you run the AWS IoT Greengrass Core software with the --component-default-user ggc_user:ggc_group option, the software sets this parameter in the nucleus component.
         */
        posixUser: string;

        /**
         * This feature is available in v2.4.0 and later of this component.
         * The system resource limits to apply to generic and non-containerized Lambda component processes by default. You can override system resource limits for individual components when you create a deployment.
         */
        systemResourceLimits?: {
            /**
             * The maximum amount of CPU time that each component's processes can use on the core device. A core device's total CPU time is equivalent to the device's number of CPU cores. For example, on a core device with 4 CPU cores, you can set this value to 2 to limit each component's processes to 50 percent usage of each CPU core. On a device with 1 CPU core, you can set this value to 0.25 to limit each component's processes to 25 percent usage of the CPU. If you set this value to a number greater than the number of CPU cores, the AWS IoT Greengrass Core software doesn't limit the components' CPU usage.
             */
            cpus: number;
            /**
             * The maximum amount of RAM (in kilobytes) that each component's processes can use on the core device.
             */
            memory: number;
        }
    };

    /**
     * (Optional) The logging configuration for the core device.
     * Default: INFO
     */
    logging?: {
        
        level?: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

        /**
         * (Optional) The data format of the logs. Choose from the following options:
            TEXT – Choose this option if you want to view logs in text form.
            JSON – Choose this option if you want to view logs with the Greengrass CLI logs command or interact with logs programmatically.
            Default: TEXT
         */
        format?: 'JSON' | 'TEXT';

        /**
         * (Optional) The output type for logs. Choose from the following options:
            FILE – The AWS IoT Greengrass Core software outputs logs to files in the directory that you specify in outputDirectory.
            CONSOLE – The AWS IoT Greengrass Core software prints logs to stdout. Choose this option to view logs as the core device prints them.
            Default: FILE
         */
        outputType?: 'FILE' | 'CONSOLE';

        /**
         * (Optional) The maximum size of each log file (in kilobytes). After a log file exceeds this maximum file size, the AWS IoT Greengrass Core software creates a new log file.
            This parameter applies only when you specify FILE for outputType.
            Default: 1024
         */
        fileSizeKB?: number;

        /**
         * (Optional) The maximum total size of log files (in kilobytes) for each component, including the Greengrass nucleus. The Greengrass nucleus' log files also include logs from plugin components. After a component's total size of log files exceeds this maximum size, the AWS IoT Greengrass Core software deletes that component's oldest log files.
            This parameter is equivalent to the log manager component's disk space limit parameter (diskSpaceLimit), which you can specify for the Greengrass nucleus (system) and each component. The AWS IoT Greengrass Core software uses the minimum of the two values as the maximum total log size for the Greengrass nucleus and each component.
            This parameter applies only when you specify FILE for outputType.
            Default: 10240
         */
        totalLogsSizeKB?: number;

        /**
         * (Optional) The output directory for log files.
            This parameter applies only when you specify FILE for outputType.
            Default: /greengrass/v2/logs, where /greengrass/v2 is the AWS IoT Greengrass root folder.
         */
        outputDirectory?: string;
    };

    /**
     * This parameter is available in v2.1.0 and later of this component.
        (Optional) The fleet status configuration for the core device.
        This object contains the following information:
     */
    fleetstatus?: {

        /**
         * (Optional) The amount of time (in seconds) between which the core device publishes device status to the AWS Cloud.
            Minimum: 86400
            Default: 86400
         */
        periodicStatusPublishIntervalSeconds?: number;
    };

    /**
     * (Optional) The system health telemetry configuration for the core device
     */
    telemetry?: {

        /**
         * (Optional) You can enable or disable telemetry.
            Default: true
         */
        enabled?: boolean;

        /**
         * (Optional) The interval (in seconds) over which the core device aggregates metrics.
            If you set this value lower than the minimum supported value, the nucleus uses the default value instead.
            Minimum: 3600
            Default: 3600
         */
        periodicAggregateMetricsIntervalSeconds?: number;

        /**
         * (Optional) The amount of time (in seconds) between which the core device publishes telemetry metrics to the AWS Cloud.
            If you set this value lower than the minimum supported value, the nucleus uses the default value instead.
            Minimum: 86400
            Default: 86400
         */
        periodicPublishMetricsIntervalSeconds?: number;
    };

    /**
     * (Optional) The period in seconds at which to poll for deployment notifications.
        Default: 15
        */
    deploymentPollingFrequencySeconds?: number;

    /**
     * (Optional) The maximum size on disk of the component store, which comprises component recipes and artifacts.
        Default: 10000000000 (10 GB)
        */
    componentStoreMaxSizeBytes?: number;

    /**
     * (Optional) A dictionary of attributes that identify the core device's platform. Use this to define custom platform attributes that component recipes can use to identify the correct lifecycle and artifacts for the component. For example, you might define a hardware capability attribute to deploy only the minimal set of artifacts for a component to run. 
        You can also use this parameter to override the os and architecture platform attributes of the core device.
        */
    platformOverride?: {
        [key: string]: string;
    }
}


