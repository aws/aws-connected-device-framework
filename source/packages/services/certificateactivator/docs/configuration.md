# CERTIFICATE ACTIVATOR CONFIGURATION


## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      "crl": {
        /*
          The S3 bucketname where the certificate revocation list is stored
        */
        "bucket": "?",
        /*
          The S3 key where the certificate revocation list (json file) is stored
        */
        "key": "?"
      }
    }
  },
  "assetLibrary": {
    "templateProfiles": {
      /*
        A map indicating which provisioning template (value) the device type (key) is to use
      */
      "edge": "default"
    }
  }
}
```


## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module locally, the following configuration will need defining manually via the module's `{env}-config.json` file.

```json
{
  "aws": {
    /*
      The AWS region code 
    */      
    "region": "?"
  },
  "assetLibrary": {
    /*
      The name of the CDF Asset Library lambda
    */
    "apiFunctionName": "?"
  },
  "provisioning": {
    /*
      The name of the CDF provisioning lambda
    */
    "apiFunctionName": "?"
  }
}
```
