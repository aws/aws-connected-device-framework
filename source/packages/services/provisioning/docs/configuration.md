# PROVISIONING CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

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

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:


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
      "deleteCertificates": null,
      /*
        Feature toggle. If enabled, will delete policies when a thing is deleted and the policiy is no longer in use.
      */
      "deletePolicies": null
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
