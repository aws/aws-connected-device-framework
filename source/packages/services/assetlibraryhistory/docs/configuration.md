# ASSET LIBRARY HISTORY CONFIGURATION

The recommended way to create a local configuration file for the Asset Library History service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
# The allowed CORS origin to validate requests against.
CORS_ORIGIN=*
CORS_EXPOSED_HEADERS=content-type,location

# If a custom domain has been configured for this module, specifying its base path here will remove 
# the base path from the request to allow the module to map the incoming request to the correct lambda handler
CUSTOMDOMAIN_BASEPATH=

SUPPORTED_API_VERSIONS=application/vnd.aws-cdf-v1.0+json,application/vnd.aws-cdf-v2.0+json
#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info

PORT=3000
```