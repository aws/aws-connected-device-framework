# ASSET LIBRARY CONFIGURATION

The recommended way to create a local configuration file for the Asset Library service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

# Optional Configuration

Default properties can be found in [here](../src/config/.env.defaults). Below are the properties that you can override.

```ini

# Events may be published to an MQTT topic for any additions, updates
# or deletions to groups, devices, policies, group templates, device 
# templates and/or profiles. The following represents the default 
# topics that are built into the application. To disable, override 
# with an empty string.
EVENTS_GROUPS_TOPIC=cdf/assetlibrary/events/groups/{objectId}/{event}
EVENTS_DEVICES_TOPIC=cdf/assetlibrary/events/devices/{objectId}/{event}
EVENTS_POLICIES_TOPIC=cdf/assetlibrary/events/policies/{objectId}/{event}
EVENTS_GROUPTEMPLATES_TOPIC=cdf/assetlibrary/events/groupTemplates/{objectId}/{event}
EVENTS_DEVICETEMPLATES_TOPIC=cdf/assetlibrary/events/deviceTemplates/{objectId}/{event}
EVENTS_PROFILES_TOPIC=cdf/assetlibrary/events/profiles/{objectId}/{event}

# When a device is created, if certain attributes are not provided then
# these defaults are used. These only need to be set if they need to be 
# changed

# If no intial group to be associated with is provided when the device
# is first created, the following `relation` is created to the 
# specified  `groupPath`:  
DEFAULTS_DEVICES_PARENT_RELATION=parent
DEFAULTS_DEVICES_PARENT_GROUPPATH=/unprovisioned
# If no initial state is provided when the device is first created, the state is set to the following:
DEFAULTS_DEVICES_STATE=unprovisioned
# Early versions of the Asset Library allowed devices and groups to be
# added to any device/group type as its parent. Later this was changed 
# so that the  allowed parent types may be defined in the device/group 
# template, but to be backwards compatible this feature is disable by 
# default. Set to `true`  to enable.
DEFAULTS_GROUPS_VALIDATEALLOWEDPARENTPATHS=false

# The allowed CORS origin to validate requests against.
CORS_ORIGIN=*
CORS_EXPOSED_HEADERS=content-type,location

# If a custom domain has been configured for this module, specifying its base path here will remove 
# the base path from the request to allow the module to map the incoming request to the correct lambda handler
CUSTOMDOMAIN_BASEPATH=

# The Asset Library mode. `full` (default) will enable the full feature set and
# use Neptune as its datastore, whereas `lite` will offer a reduced feature set 
# (see documentation) and use the AWS IoT Device Registry as its datastore.
MODE=full

CACHE_TYPES_TTL=30
    
SUPPORTED_API_VERSIONS=application/vnd.aws-cdf-v1.0+json,application/vnd.aws-cdf-v2.0+json

# If true, fine-grained access control will be enabled. Refer to documentation 
# for additional steps required (custom IdP claims).
AUTHORIZATION_ENABLED=false

#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info

PORT=3000

```