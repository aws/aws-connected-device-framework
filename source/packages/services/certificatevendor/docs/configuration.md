# CERTIFICATE VENDOR CONFIGURATION

The recommended way to create a local configuration file for the Certificate Vendor service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).

# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
# The AWS IoT continuous job uses a static thing group as its target. The thing group `cdfRotateCertificates`
# is created automatically by the deployment. Change the name of the thing group if you want to use an
# alternate thing group.
AWS_IOT_THINGGROUP_ROTATECERTIFICATES=cdfRotateCertificates

# The key prefix, and key suffix, where certificates are stored
AWS_S3_CERTIFICATES_PREFIX=certificates/
AWS_S3_CERTIFICATES_SUFFIX=.zip

# Expiry time in seconds for the presigned url generated
AWS_S3_CERTIFICATES_PRESIGNEDURL_EXPIRESINSECONDS=300

#$ The MQTT topics to publish/subscribe. If alternate topics are required, change here. Note that
# the alternate MQTT topics will need providing as part of the deployment as the CloudFormation
# template sets up the consuming AWS IoT Rules.
MQTT_TOPICS_GET_SUCCESS=cdf/certificates/{thingName}/get/accepted
MQTT_TOPICS_GET_FAILURE=cdf/certificates/{thingName}/get/rejected
MQTT_TOPICS_GET_ROOT=cdf/certificates/+/get
MQTT_TOPICS_ACK_SUCCESS=cdf/certificates/{thingName}/ack/accepted
MQTT_TOPICS_ACK_FAILURE=cdf/certificates/{thingName}/ack/rejected
MQTT_TOPICS_ACK_ROOT=cdf/certificates/+/ack
#  A feature toggle to enable deleting of the old certificate once rotated.
FEATURES_DELETEPREVIOUSCERTIFICATE=false

# When a certficate has been vended and activated, if the following values are set then the device registry
# or Asset Library (depending on which mode the app is running in) is updated by setting the key defined in
# `defaults.device.state.success.key` to the value defined in `defaults.device.state.success.value`.
DEFAULTS_DEVICE_STATUS_SUCCESS_KEY=status
DEFAULTS_DEVICE_STATUS_SUCCESS_VALUE=active
# If creating a new certificate from a CSR, the expiration date to set.
DEFAULTS_CERTIFICATES_CERTIFICATEEXPIRYDAYS=1095

# Which data store to use to validate the status of a device: `AssetLibrary`, `DeviceRegistry` or `None`.
REGISTRY_MODE=Assetlibrary

#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info
```
