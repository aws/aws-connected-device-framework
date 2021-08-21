# AUTH JWT CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "token": {
    /*
      The name of the issuer to validate within the token
    */
    "issuer": null
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module locally, the following configuration will need defining manually via the modules's `{env}-config.json` file.

```json
{
  "aws": {
    /*
      The AWS region code 
    */       
    "region": "?",
    /*
      The AWS account ID
    */      
    "accountId": "?"
  }
}
```
