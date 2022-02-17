# COMMANDS CONFIGURATION

The recommended way to create a local configuration file for the Commands service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
# The S3 key prefix where commands artifacs are stored
AWS_S3_PREFIX=commands/
# provisioning template to add a thing to a thing group
TEMPLATES_ADDTHINGTOGROUP=add_thing_to_group
# If a custom domain has been configured for this module, specifying its base path here will remove the base path from the request to allow the module to map the incoming request to the correct lambda handler.
CUSTOMDOMAIN_BASEPATH=
#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info
```
