# SIMULATION MANAGER CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      /*
      * The S3 bucket where Simulation artifacts will be stored
      */
      "bucket": "?"
    }
  },
  "templates": {
    /*
      The location of the provisioning task property template
    */
    "provisioning": "?",
    /*
      The location of the simulation task property template
    */
    "simulation": "?"
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
      * The S3 key prefix where Simulation artifacts will be stored
      */
      "prefix": "simulations/"
    }
  },
  /*
    A runner represents the configuration for a Fargate instance. 
  */
  "runners": {
    /*
      local location where to store jmeter execution results
    */
    "dataDir": "/opt/apache-jmeter-5.4.3/bin/cdf",
    /*
      Container allocated memory size. Tune for best performance.
    */
    "memory": 2048,
    /*
      Container allocated cpu. Tune for best performance.
    */
    "cpu": 1024,
    /*
      Number of concurrent threads jmeter can run. This directly affects the number of Tasks that are spun up to run the simulation. Tune for best performance.
    */
    "threads": 20
  },
  "cors": {
    /*
        The allowed CORS origin to validate requests against.
    */
    "origin": null
  },
  
  "logging": {
    /*
      Application logging level. Set to (in order) error, warn, info, verbose, debug 
      or silly.
    */
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
      The AWS account ID
    */
    "accountId": "?",
    /*
      The AWS region code 
    */      
    "region": "?",
    "dynamodb": {
      "table": {
        /*
          The DynamoDb table where the generated simulation data is stored
        */
        "simulations": "cdf-simulation",
        /*
          The DynamoDb table where the last known device state is stored
        */
        "state": "cdf-simulation-device-state"
      }
    },
    "iot": {
      /*
        The AWS IoT endpoint
      */
      "host": "?"
    },
    "sns": {
      "topics": {
        /*
          The SNS topic arn where simulation events are published
        */
        "launch": "?"
      }
    }
  },
  "cdf": {
    "assetlibrary": {
      /*
        The version (specified via mime type) of asset library to use
      */
      "mimetype": "application/vnd.aws-cdf-v2.0+json",
      /*
        The Asset Library url
      */
      "host":"?"
    }
  }
}
```
