# Application Configuration

## Introduction

Each CDF module requires or utilizes application configuration which can alter the behaviour of the module based on the config provided.

This configuration relies on the [`node_config`](https://github.com/lorenwest/node-config) module to manage the configuration. The configuration can be overridden by providing an external JSON file with the overridden parameters to change the behaviour of the targeted module.

The steps below outlines how to set up the configurations. 
1. Create a configuration directory
2. Specify the configurations for the modules required
3. Deploy AWS Connected Device Framework with the configurations

### Create a configuration directory

The purpose of the configuration directory is to house all the application specific configurations and specify which CDF modules needs to be deployed.

**Note: If a CDF deployment is made by specifying a configuration directory, only those CDF modules will be deployed which are specified in the configuration directory.**

Create a directory to house all the module specific configurations. i.e.
```
|cdf-configurations/
    |assetlibrary/
        |{env}-config.json
    |provisioning/
        |{env}-config.json
    | ... (other modules)
        |{env}-config.json
        
Example: 

|cdf-configurations/
    |assetlibrary/
        |development-config.json
        |development-local-config.json
        |prod-config.json
        |qa-config.json
        |stage-config.json
    |provisioning/
        |development-config.json
        |development-local-config.json
        |prod-config.json
        |qa-config.json
        |stage-config.json
    | ... (other modules)
        |development-config.json
        |development-local-config.json
        |prod-config.json
        |qa-config.json
        |stage-config.json
    
```

## Specify the configurations

Each module implements its own configuration. This configuration can be broken down into 3 distinct components:
mandatory, optional, and what additional is required if wanting to run locally.

Each CDF module contains a `docs/configuration.md` page which describes the configuration available for the module.

#### Mandatory configuration

Any mandatory configuration required by a module is to be specified before a deployment is made.

Example of a mandatory configuration is below.

**Provisioning Module Mandatory Configuration:**
```json
{
  "aws": {
    "s3": {
      "templates": {
        /*
          The S3 bucketname where templates are stored
        */
        "bucket": "?"
      },
      "certificates": {
        /*
          The S3 bucketname where certificates are stored
        */
        "bucket": "${aws.s3.templates.bucket}"
      },
      "bulkrequests": {
        /*
          The S3 bucketname where bulk request artifacts are stored
        */
        "bucket": "${aws.s3.templates.bucket}"
      }
    }
  }
}
```

#### Optional Configuration

The optional configuration is self explanatory, each module has configuration which can be overridden to change the behaviour of the applicaiton.
If none provided, it will be defaulted by the application itself.

**Provisioning Module Optional Application Configuration:**
```json
{
  "aws": {
    "s3": {
      "templates": {
        /*
          The S3 key prefix where templates are stored
        */
        "prefix": "templates/",
        /*
          The S3 key suffix where templates are stored
        */
        "suffix": ".json"
      },
      "certificates": {
        /*
          The S3 key prefix where certificates are stored
        */
        "prefix": "certificates/"
      },
      "bulkrequests": {
        /*
          The S3 key prefix where bulk requests are stored
        */
        "prefix": "bullkrequests/"
      }
    }
  },
  "features": {
    "delete": {
      /*
        Feature toggle. If enabled, will delete certificates when a thing is deleted and the certificate is no longer in use.
      */
      "certificates": null,
      /*
        Feature toggle. If enabled, will delete policies when a thing is deleted and the policy is no longer in use.
      */
      "policies": null
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
  /*
    The default expiration days for new certificates
  */
  "deviceCertificateExpiryDays": 365,
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

#### Required Configuration For Running a Module Locally

All modules need to interact with AWS in some way such as invoking specific Lambda functions, reading/writing DynamoDB tables, etc.
This type of configuration is automatically discovered as part of the deployment.

But if running a module locally, such as during local development, this additional required configuration needs to be specified manually.

**Provisioning Module Required Configuration For Running Locally:**
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
    "s3": {
      /*
        The S3 role required for the bulk provisioning feature.
      */
      "roleArn": "?"
    }
  },
  "events": {
    "certificatesBatch": {
      /*
        The name of the SNS topic where batch requests are published and subscribed
      */
      "topic": "?"
    }
  }
}
```

## Deploy AWS Connected Device framework with the configuration

Once the configuration directory has been setup, the CDF deployment can be invoked by passing the absolute path of the configuration project as the `-c` argument of the deployment command. 

The CDF deploy script will reference the path of the infrastructure project then pass the individual configuration to individual 
modules.

