# ASSET LIBRARY EXPORT CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    /*
      This config specifies where the exported data needs to be stored.
    */
    "s3": {
      "export": {
        /*
          set the target bucket
        */
        "bucket": "?"
      }
    }
  }
}
```

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
  "aws": {
    /*
      This config specifies where the exported data needs to be stored.
    */
    "s3": {
      "export": {
        /*
          Modify the key prefix if it needs to be different then the default
        */
        "prefix": "assetlibrary-export/"
      }
    }
  },
  
  "defaults": {
    /*
      The following config handles how the assetlibrary items needs to be chunked for batch processing 
    */
    "batch": {
      /*
        specify the batch size to handle how many assetlibrary items needs to be batch togethar for the ETL workflow
      */
      "size": 100,
      /*
        specify this property to export the data batched by types, 
        the supported config is either "type" or "category"
      */
      "by": "type"
    },
    "etl": {
      /*
        The following config handles ETL workflow's extraction process
      */
      "extract": {
        /*
          This configuration is to control how the devices needs to be extracted for exporting
        */
        "deviceExtractor": {
          /*
            Set this to true if the device components need to be expaded
           */
          "expandComponents": true,
          /*
            specify any specific attributes which needs to be extracted, if its set to
            empty string then all attributes are extracted
          */
          "attributes": "",
          /*
            Set this property to true, if any related groups needs to be included.
          */
          "includeGroups": true
        }
      },
      /*
        The following config handles ETL workflow's loading process
      */
      "load": {
        /*
          Currently the only load target supported is "S3". This cannot be set to anything else, without supporting
          additonal load targets.
        */
        "type": "S3",
        /*
          Modify the path, to configure the export "S3" key path. The default below, will export with i.e
          assetlibrary-export/devices/<some-type>/2021-12-12-12-12/<batch.id>.json
        */
        "path": "${aws.s3.export.prefix}${batch.category}/${batch.type}/dt=${moment(batch.timestamp).format('YYYY-MM-DD-HH-MM')}/${batch.id}.json"
      }
    }
  },
  /*
    Application logging level. Set to (in order) error, warn, info, verbose, debug 
    or silly.
  */
  "logging": {
    "level": "debug"
  }
}
```

## Required Configuration For Running Locally

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module locally, the following configuration will need defining manually via the modules's `{env}-config.json` file.

```json
{
    "aws": {
      /*
        The AWS region code 
      */
      "region": "?"
    }
}
```
