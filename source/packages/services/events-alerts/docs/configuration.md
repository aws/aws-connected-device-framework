# EVENTS ALERTS CONFIGURATION

The recommended way to create a local configuration file for the Events Alerts service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
#Application logging level. Set to (in order) error, warn, info, verbose, debug  or silly.
LOGGING_LEVEL=info
```