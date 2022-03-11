# GREENGRASS V2 INSTALLER CONFIG CONFIGURATION

The recommended way to create a local configuration file for the Greengrass V2 Installer Config is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
# Path to greengrass v2 artifacts
DEVICE_ROOT_PATH=/greengrass/v2
# Path to greengrass v2 artifacts AWS root CA
DEVICE_ROOT_CA_PATH=/greengrass/v2/AmazonRootCA1.pem
# Path to greengrass v2 certificate
DEVICE_CERTIFICATE_FILE_PATH=/greengrass/v2/cert.pem
# Path to greengrass v2 private key
DEVICE_PRIVATE_KEY_PATH=/greengrass/v2/claim-certs/claim.private.pem.key
# Path to greengrass v2 claim certificate
DEVICE_CLAIM_CERTIFICATE_PATH=/greengrass/v2/claim-certs/claim.pem.crt
# Path to greengrass v2 claim private key
DEVICE_CLAIM_CERTIFICATE_PRIVATE_KEY_PATH=/greengrass/v2/claim-certs/claim.private.pem.key
#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info
```