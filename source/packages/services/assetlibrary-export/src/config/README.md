## The following env config needs defining per environment:

```ini
AWS_REGION=
AWS_S3_EXPORT_BUCKET=
DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_ATTRIBUTES=
DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_EXPANDCOMPONENTS=
DEFAULTS_ETL_EXTRACT_DEVICEEXTRACTOR_INCLUDEGROUPS=
DEFAULTS_ETL_LOAD_TYPE=S3
NEPTUNEURL=
```

## The following may be overridden:

```ini
AWS_S3_EXPORT_PREFIX=assetlibrary-export/
DEFAULTS_BATCH_BY=TYPE
DEFAULTS_BATCH_SIZE=100
DEFAULTS_ETL_LOAD_PATH=${aws.s3.export.prefix}${batch.category}/${batch.type}/dt=${moment(batch.timestamp).format('YYYY-MM-DD-HH-MM')}/${batch.id}.json
LOGGING_LEVEL=info
```
