# ASSET LIBRARY CONFIGURATION

The following are the allowed configuration properties for the Asset Library service.

Note:  Any marked as `Deployment script` for _Source_ are automatically set by the deployment script. But if running a service locally, you must manually set these configuration properties.

Any properties that have a default are defaulted within the service itself.  These default values will not be present in the configuration file, nor do the default values needs adding to the configuration file.  For defaults that are not mandatory, these may be disabled by overriding (setting in your configuration file) with an empty string.

Property Json Path | Default | Mandatory | Source | Description
--- | --- | --- | --- | ---
.authorization.enabled | false | No | | If true, fine-grained access control will be enabled. Refer to documentation for additional steps required to setup.
.aws.iot.endpoint |  | Yes | Deployment script | AWS IoT endpoint
.aws.region |  | Yes | Deployment script | AWS region
.cors.origin |  | No | | CORS origin header to apply.
.defaults.devices.parent.groupPath | /unprovisioned | No | | If set, and a device is created with no relations provided, this path is used as the default.
.defaults.devices.parent.relation | parent | No | | If set, and a device is created with no relations provided, this relation is used as the default.
.defaults.devices.state | unprovisioned | No | | If set, and a device is created with no status provided, this is used as the default.
.defaults.groups.validateAllowedParentPaths | false | No | | If true, group parent paths/types will be validated as according to the groups allowed relation types as defined in its template. Default is false for backwards compatability.
.events.devices.topic | cdf/assetlibrary/events/devices/{objectId}/{event} | No |  | If set, any device related events are published to this topic.
.events.deviceTemplates.topic | cdf/assetlibrary/events/deviceTemplates/{objectId}/{event} | No |  | If set, any device template related events are published to this topic.
.events.groups.topic | cdf/assetlibrary/events/groups/{objectId}/{event} | No |  | If set, any group related events are published to this topic.
.events.groupTemplates.topic | cdf/assetlibrary/events/groupTemplates/{objectId}/{event} | No |  | If set, any group templates related events are published to this topic.
.events.policies.topic | cdf/assetlibrary/events/policies/{objectId}/{event} | No |  | If set, any policy related events are published to this topic.
.events.profiles.topic | cdf/assetlibrary/events/profiles/{objectId}/{event} | No |  | If set, any profile related events are published to this topic.
.logging.level | debug | No | | Logging level:  error, warn, info, debug.
.mode | full | No | | `full`=graph mode (uses Neptune). `lite`=limited mode (uses AWS IoT Device Registry only).
.neptuneUrl |  | Yes | Deployment script | Neptune cluster endpoint




