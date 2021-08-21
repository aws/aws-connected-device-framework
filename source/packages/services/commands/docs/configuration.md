# COMMANDS CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      /*
        The S3 bucketname where artifacts created as part of commands are stored.
      */
      "bucket": "?"
    }
  }
}
```

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
  "aws": {
    "s3": {
      /*
        The S3 key prefix where commands artifacs are stored
      */
      "prefix": "commands/"
    },
    "jobs": {
      /*
        Max number of targerts for a job
      */
      "maxTargets": 100
    }
  },
  /*
    The path to tmpdir 
   */
  "tmpdir": "/tmp",
  "mqtt": {
    "topics": {
      /*
        customize this mqtt topic for presignedurl generation
      */
      "presigned": "cdf/commands/presignedurl/{commandId}/{thingName}/{direction}"
    }
  },
  "templates": {
    /*
      provisioning template to add a thing to a thing group
    */
    "addThingToGroup": "add_thing_to_group"
  },
  "cors": {
    /*
        The allowed CORS origin to validate requests against.
    */
    "origin": null,
    /*
        The allowed CORS headers to expose.
    */
    "exposedHeaders": "content-type,location"
  },
  "logging": {
    /*
      Application logging level. Set to (in order) error, warn, info, verbose, debug 
      or silly.
    */
    "level": "debug"
  },
  "customDomain": {
    /*
      If a custom domain has been configured for this module, specifying its base path here will remove the base path from the request to allow the module to map the incoming request to the correct lambda handler.
    */
    "basePath": null
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
    "region": null,
    "iot": {
      /*
        The AWS IoT endpoint
      */
      "endpoint": null
    }
  },
  "tables": {
    /*
      The name of the commands module templates table
    */
    "templates": "cdf-commands-templates",
    /*
      The name of the commands module jobs table
    */
    "jobs": "cdf-commands-jobs"
  },

  "assetLibrary": {
    /*
      The name of the CDF AssetLibrary lambda
    */
    "apiFunctionName": null
  },
  "provisioning": {
    /*
      The name of the CDF provisioning lambda
    */
    "apiFunctionName": null
  }
}
```
