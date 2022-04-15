## The following env config needs defining per environment:

```ini
AWS_REGION=
AWS_ACCOUNTID=

AWS_DYNAMODB_TABLE_SIMULATIONS=
AWS_DYNAMODB_TABLE_STATE=
AWS_IOT_HOST=
AWS_S3_BUCKET=
AWS_SNS_TOPICS_LAUNCH=

ASSETLIBRARY_API_FUNCTION_NAME=
```

## The following may be overridden:

```ini
AWS_S3_PREFIX=simulations/
CORS_ORIGIN=*
LOGGING_LEVEL=info
RUNNERS_DATADIR=/opt/apache-jmeter-5.1.1/bin/cdf
RUNNERS_MEMORY=2048
RUNNERS_CPU=1024
RUNNERS_THREADS=20
TEMPLATES_PROVISIONING=packages/services/simulation-manager/src/templates/provisioning.task.properties
TEMPLATES_SIMULATION=packages/services/simulation-manager/src/templates/simulation.task.properties
```
