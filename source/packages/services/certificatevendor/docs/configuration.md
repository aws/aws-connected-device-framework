# CERTIFICATE VENDOR CONFIGURATION

## Mandatory Configuration

The following represents mandatory configuration that can be provided at time of deployment via the modules `{env}-config.json` file:

```json
{
  "aws": {
    "s3": {
      /*
        The bucket name, key prefix, and key suffix, where certificates are stored
      */
      "certificates": {
        "bucket": "?",
        "prefix": "certificates/",
        "suffix": ".zip"
      }
    }
  },
  "certificates": {
    /*
      The ID of the custom registered CA to be used to create certificates from CSR's.
      NOTE: This implementation supports a single CA only. To support multiple this module
      needs enhancing to be similar in how the bulkcerts modules supports multiple.
    */
    "caCertificateId": "?"
  },
  "policies": {
    /*
      The name of the AWS IoT policy to be attached to new certificates.
      NOTE: This implementation supports adding a single defined policy to all new certificates. This
      could be enhanced to copy over the policies from the old certificate, be dynamic based on attribues 
      such as device type, or the devices status within the Asset Library.
    */
    "rotatedCertificatePolicy": "?"
  },
  "features": {
    /*
      A feature toggle to enable deleting of the old certificate once rotated.
    */
    "deletePreviousCertificate": false
  }
}
```

## Optional Configuration

The following represents optional configuration that can be provided at time of deployment via the modules `{env}-config.json` file. If a value is listed, this is the value that is bundled into the application as a default. You only need to specify a configuration value from the following if you need to change it:


```json
{
  "aws": {
    "iot": {
      "thingGroup": {
        /*
          The AWS IoT continuous job uses a static thing group as its target. The thing group `cdfRotateCertificates`
          is created automatically by the deployment. Change the name of the thing group if you want to use an
          alternate thing group.
        */
        "rotateCertificates": "cdfRotateCertificates"
      }
    }
  },
  "mqtt": {
    "topics": {
      /*
        The MQTT topics to publish/subscribe. If alternate topics are required, change here. Note that
        the alternate MQTT topics will need providing as part of the deployment as the CloudFormation
        template sets up the consuming AWS IoT Rules.
      */
      "get": {
        "success": "cdf/certificates/{thingName}/get/accepted",
        "failure": "cdf/certificates/{thingName}/get/rejected",
        "root": "cdf/certificates/+/get"
      },
      "ack": {
        "success": "cdf/certificates/{thingName}/ack/accepted",
        "failure": "cdf/certificates/{thingName}/ack/rejected",
        "root": "cdf/certificates/+/ack"
      }
    }
  },
  "defaults": {
    "device": {
      /*
        When a certficate has been vended and activated, if the following values are set then the device registry
        or Asset Library (depending on which mode the app is running in) is updated by setting the key defined in 
        `defaults.device.state.success.key` to the value defined in `defaults.device.state.success.value`.
      */
      "status": {
        "success": {
          "key": "status",
          "value": "active"
        }
      }
    },
    "certificates": {
      /*
        If creating a new certificate from a CSR, the expiration date to set.
      */
      "certificateExpiryDays": 1095
    }
  },
  "registry": {
    /*
      Which data store to use to validate the status of a device: `AssetLibrary`, `DeviceRegistry` or `None`.
    */
    "mode": "AssetLibrary"
  },
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

As part of the deployment flow there is some configuration that is auto-discovered and set. If running the module, the following configuration will need defining manually via the module's `{env}-config.json` file.

```json
{
  "aws": {
    /*
      The AWS region code 
    */      
    "region": "?",
    "iot": {
      /*
        The AWS IoT endpoint
      */      
      "endpoint": "?"
    }
  },
  "assetLibrary": {
    /*
      The name of the Asset Library lambda function (if `registry.mode` has been defined as `AssetLibrary`).
    */
    "apiFunctionName": "?"
  }
}
```
