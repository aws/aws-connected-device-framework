# EVENTS PROCESSOR CONFIGURATION

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it

```json
{
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
      The AWS account ID
    */
    "accountId": "?",
    /*
      The AWS region code 
    */
    "region": "?",
    "iot": {
      /*
        The AWS IoT endpoint
      */
      "endpoint": "?"
    },
    "dynamoDb": {
      "tables": {
        "eventConfig": {
          /*
            The name of the CDF Event Processor Event Config DynamoDB table
          */
          "name": "?"
        },
        "eventNotifications": {
          /*
            The name of the CDF Event Processor Event Notifications DynamoDB table
          */
          "name": "?"
        }
      },
      "dax": {
        /*
          The DAX Endpoint
        */
        "endpoints": "?"
      }
    },
    "lambda": {
      "dynamoDbStream": {
        /*
          The name of the CDF Event Processor Event Notifications DynamoDB table Stream Arn
        */
        "name": "?"
      },
      "lambdaInvoke": {
        /*
          The name of the CDF provisioning lambda
        */
        "arn": "?"
      }
    },
    "sqs": {      
      /*
        The SQS queue url used to perform async processing
      */
      "asyncProcessing": "?"
    }
  }
}
```

