# PROVISIONING CONFIGURATION

The recommended way to create a local configuration file for the Provisioning service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

# Optional Configuration

Default properties can be found in [here](../src/config/.env.defaults). Below are the properties that you can override.

```sh
# The S3 key prefix where bulk requests are stored
AWS_S3_BULKREQUESTS_PREFIX=bullkrequests/
# The S3 key prefix where templates are stored
AWS_S3_TEMPLATES_PREFIX=templates/
# The S3 key suffix where templates are stored
AWS_S3_TEMPLATES_SUFFIX=.json
# The allowed CORS origin to validate requests against.
CORS_ORIGIN=*
#  The allowed CORS headers to expose.
CORS_EXPOSED_HEADERS=content-type,location
# If a custom domain has been configured for this module, specifying its base path here will remove 
# the base path from the request to allow the module to map the incoming request to the correct lambda handler
CUSTOMDOMAIN_BASEPATH=
# he default expiration days for new certificates
DEVICE_CERTIFICATE_EXPIRY_DAYS=365
# Feature toggle. If enabled, will delete certificates when a thing is deleted and the certificate is no longer in use.
FEATURES_DELETE_CERTIFICATES=true
# Feature toggle. If enabled, will delete policies when a thing is deleted and the policiy is no longer in use.
FEATURES_DELETE_POLICIES=true
LOGGING_LEVEL=info
```