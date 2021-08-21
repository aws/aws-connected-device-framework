# BULK CERTS CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      "certificates": {
        /*
          The S3 bucketname where certificates will be stored
        */
        "bucket": "?"
      }
    }
  },
  /*
    Attributes to add to the generated certificates. At least one value must be provided:
  */
  "deviceCertificateInfo": {
    "commonName": null,
    "organization": null,
    "organizationalUnit": null,
    "locality": null,
    "stateName": null,
    "country": null,
    "emailAddress": null,
    "distinguishedNameQualifier": null
  },
  "supplierRootCa": {
    /*
      For each supplier alias being used, specify the ID of the custom CA certificate being used. If instead the AWS roto CA is being used instead of a custom CA, then use `AwsIotDefault` as the value
    */
    "<supplierAlias>": "?",
  }
}
```

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
  "aws": {
    "s3": {
      "certificates": {
        /*
          The S3 key prefix where certificates will be stored
        */
        "prefix": null
      }
    }
  },
  /*
    The expiry duration (days) to set for device certificates
  */
  "deviceCertificateExpiryDays": 365,
  /*
    Optional CORS settings.
  */
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
  "defaults": {
    /*
      The chunk size that the number of requested certificates are split into
    */
    "chunkSize": 100
  },
  /*
    Application logging level. Set to (in order) error, warn, info, verbose, debug 
    or silly.
  */
  "logging": {
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
    "dynamodb": {
      "tasks": {
        /*
          The name of the DynamoDB table
        */
        "tableName": "?"
      }
    }
  },
  "events": {
    "request": {
      /*
        The name of the SNS topic where batch requests are published and subscribed
      */
      "topic": "?"
    }
  }
}
```
