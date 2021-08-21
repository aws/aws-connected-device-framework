# GREENGRASS DEPLOYMENT CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    /*
      Deployment Logs Bucket Settings.
    */
    "s3": {
      "deploymentLogs": {
        /*
          Bucket where deployment logs will be stored
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
      Deployment Logs Bucket Settings.
    */
    "s3": {
      "deploymentLogs": {
        /*
          Key prefix where the deployment logs will be stored
        */
        "prefix": "?"
      }
    }
  },
  /*
    Optional CORS settings.
  */
  "cors": {
    /*
      The allowed CORS origin to validate requests against.
    */
    "origin": "?",
    "exposedHeaders": "content-type,location"
  },
  /*
    Application logging level. Set to (in order) error, warn, info, verbose, debug 
    or silly.
  */
  "logging": {
    "level": "debug"
  },
  /*
    If a custom domain has been configured for this module, specifying its base path here will remove the base path from the request to allow the module to map the incoming request to the correct lambda handler.
  */
  "customDomain": {
    "basePath": "?"
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
    "region": "?",
    "ssm": {
      /*
        The SSM Association managed instance role which will be applied to
        the instances being onboarded on SSM. This role provides the permissions 
        aws services to the device
      */
      "managedInstanceRole": "?"
    },
    /*
      SQS Queues Settings.
    */
    "sqs": {
      /*
        Agentless Deployment Queue Url
      */
      "agentbasedDeploymentQueue": "?"
    },
    /*
      DynamoDB Table Settings
    */
    "dynamoDB": {
      /*
        Greengrass provisioning dyamodb table name
      */
      "ggProvisioningTable": "?"
    }
  }
}
```
