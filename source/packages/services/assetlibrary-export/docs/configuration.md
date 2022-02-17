# ASSET LIBRARY EXPORT CONFIGURATION

The recommended way to create a local configuration file for the Asset Library Export service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).
# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

# Optional Configuration

Default properties can be found in [here](../src/config/.env.defaults). Below are the properties that you can override.

```ini
# Modify the key prefix if it needs to be different then the default      
AWS_S3_EXPORT_PREFIX=assetlibrary-export/
# specify this property to export the data batched by types, 
# the supported config is either "type" or "category"
DEFAULTS_BATCH_BY=TYPE
# specify the batch size to handle how many assetlibrary items needs to be batch togethar for the ETL workflow
DEFAULTS_BATCH_SIZE=100
# Modify the path, to configure the export "S3" key path. The default below, will export with i.e
# assetlibrary-export/devices/<some-type>/2021-12-12-12-12/<batch.id>.json
DEFAULTS_ETL_LOAD_PATH=${aws.s3.export.prefix}${batch.category}/${batch.type}/dt=${moment(batch.timestamp).format('YYYY-MM-DD-HH-MM')}/${batch.id}.json
LOGGING_LEVEL=info
```
