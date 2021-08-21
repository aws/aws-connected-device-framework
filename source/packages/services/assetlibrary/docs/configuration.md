# ASSET LIBRARY CONFIGURATION

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules's `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:

```json
{
    /*
      Events may be published to an MQTT topic for any additions, updates
      or deletions to groups, devices, policies, group templates, device 
      templates and/or profiles. The following represents the default 
      topics that are built into the application. To disable, override 
      with an empty string.
    */
    "events": {
        "groups": {
            "topic": "cdf/assetlibrary/events/groups/{objectId}/{event}"
        },
        "devices": {
            "topic": "cdf/assetlibrary/events/devices/{objectId}/{event}"
        },
        "policies": {
            "topic": "cdf/assetlibrary/events/policies/{objectId}/{event}"
        },
        "groupTemplates": {
            "topic": "cdf/assetlibrary/events/groupTemplates/{objectId}/{event}"
        },
        "deviceTemplates": {
            "topic": "cdf/assetlibrary/events/deviceTemplates/{objectId}/{event}"
        },
        "profiles": {
            "topic": "cdf/assetlibrary/events/profiles/{objectId}/{event}"
        }
    },

    "defaults": {
        /*
          When a device is created, if certain attributes are not provided then
          these defaults are used. These only need to be set if they need to be 
          changed:
        */
        "devices": {
            /*
              If no intial group to be associated with is provided when the device
              is first created, the following `relation` is created to the 
              specified  `groupPath`:                 
            */
            "parent": {
                "relation": "parent",
                "groupPath": "/unprovisioned"
            },
            /*
              If no initial state is provided when the device is first created,
              the state is set to the following:
            */
            "state": "unprovisioned"
        },
        "groups": {
            /*
              Early versions of the Asset Library allowed devices and groups to be
              added to any device/group type as its parent. Later this was changed 
              so that the  allowed parent types may be defined in the device/group 
              template, but to be backwards compatible this feature is disable by 
              default. Set to `true`  to enable.
            */
            "validateAllowedParentPaths": false
        }
    },

    /*
      Optional CORS settings.
    */
    "cors": {
        /*
            The allowed CORS origin to validate requests against.
        */
        "origin": null
    },

    /*
      The Asset Library mode. `full` (default) will enable the full feature set and
      use Neptune as its datastore, whereas `lite` will offer a reduced feature set 
      (see documentation) and use the AWS IoT Device Registry as its datastore.
    */
    "mode": "full",

    /*
      If true, fine-grained access control will be enabled. Refer to documentation 
      for additional steps required (custom IdP claims).
    */
    "authorization": {
        "enabled": false
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the Asset Library locally, the following configuration will need defining manually, in addition to the optional attributes described above, via the module's `{env}-config.json` file.

```json
{
    /*
      AWS Neptune URL of the Asset Library database (if running in full mode)
    */
    "neptuneUrl": "?",
    
    "aws": {
        /*
          The AWS region code 
        */        
        "region": "?",

        /* 
          The AWS IoT endpoint
        */
        "iot": {
            "endpoint": "?"
        }
    }
}

```