# GREENGRASS PROVISIONING CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:


```json
{
  "aws": {
    "s3": {
      "artifacts": {
        /*
          The S3 bucketname where artifacts created as part of provisioning are stored.
        */
        "bucket": "?"
      },
      "bulkdeployments": {
        /*
          The S3 bucketname where bulk deployment related documents are stored.
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
    "s3": {
      "artifacts": {
        /*
          The S3 key prefix where device artifacs are stored
        */
        "prefix": null
      },
      "bulkdeployments": {
        /*
          The S3 key prefix where bulkd deployment documents are stored
        */
        "prefix": null
      }
    }
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module locally, the following configuration will need defining manually via the module's `{env}-config.json` file.


```json
{
  "aws": {
    /*
      The AWS account ID
    */
    "accountId": "?",
    /*
      The AWS region code 
    */
    "region": "?",
    "dynamoDb": {
      /*
        The name of the DynamoDB table
      */
      "table": "?"
    },
    "greengrass": {
      "bulkdeployments": {
        /*
          The IAM role required by the bulk provisoning function
        */
        "roleArn": "?"
      }
    },
    "iot": {
      /*
        The AWS IoT endpoint
      */
      "endpoint": "?"
    },
    "sqs": {
      /*
        The SQS queue url used to manage device association messages
      */
      "deviceAssociations": "?",
      /*
        The SQS queue url used to manage deployments messages
      */
      "deployments": "?",
      /*
        The SQS queue url used to manage bulk deployments status messages
      */
      "bulkDeploymentsStatus": "?",
      /*
        The SQS queue url used to manage deployment status messages
      */
      "deploymentStatus": "?",
      /*
        The SQS queue url used to manage group tasks messages
      */
      "groupTasks": "?"
    }
  },
  "provisioning": {
    /*
      The name of the CDF provisioning lambda
    */
    "apiFunctionName": "?"
  }
}
```
