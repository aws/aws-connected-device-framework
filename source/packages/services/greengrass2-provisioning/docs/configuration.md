# GREENGRASS V2 PROVISIONING CONFIGURATION

The recommended way to create a local configuration file for the Greengrass V2 Provisioning is through CDF's [installer](../../installer/README.md#deployment-using-wizard).

# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
PROMISES_CONCURRENCY=
DYNAMODB_PROMISES_CONCURRENCY=
CORES_BATCH_SIZE=
DEVICES_BATCH_SIZE=
DEPLOYMENTS_BATCH_SIZE=
# cdf provisioning lambda name
PROVISIONING_MODE=
# cdf assetlibrary lambda name
ASSETLIBRARY_MODE=
# The allowed CORS origin to validate requests against.
CORS_ORIGIN=
#  The allowed CORS headers to expose.
CORS_EXPOSED_HEADERS=
SUPPORTED_API_VERSIONS=
LOGGING_LEVEL=
```
