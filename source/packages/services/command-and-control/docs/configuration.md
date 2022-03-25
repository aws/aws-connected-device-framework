# COMMAND & CONTROL CONFIGURATION

The recommended way to create a local configuration file for the Command & Control module is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed CDF to your AWS account, you can generate `.env` file to be used for your local development.

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

# Optional Configuration

Default properties can be found in [here](../src/config/.env.defaults). Below are the properties that you can override.

```ini

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

#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info

PORT=3022

```