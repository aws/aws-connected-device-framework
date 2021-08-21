# ASSET LIBRARY HISTORY CONFIGURATION

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the Asset Library History's `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
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
    "exposedHeaders": null
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the Asset Library History locally, the following configuration will need defining manually, in addition to any optional attribues described above, via the Asset Library History's `{env}-config.json` file.

```json
{
  "aws": {
    "region": "?",
    "dynamoDb": {
      "tables": {
        "events": "?"
      }
    }
  }
}
```
