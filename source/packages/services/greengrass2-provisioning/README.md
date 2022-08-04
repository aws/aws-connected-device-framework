# CDF GREENGRASS V2 PROVISIONING

## INTRODUCTION

The `Greengrass V2 Provisioning` module takes care of the cloud portion of provisioning Greengrass C2 cores and client devices by providing the following features:

- Defining templates to represent a set of components (and their config) to deploy
- Auto-provisioning of Greengrass V2 cores, including the registration of the Thing, automated generation and registration of device certificates, association of policies, and generation of the core's installer configuration files
- Auto-provisioning of Greengrass V2 client devices, including the registration of the Thing, the automated generation and registration of device certificates, association of policies, and association with the Greengrass core
- Deletion of Greengrass V2 cores and client devices, including the deletion of their Things and certificates
- Provides an opinionated way of deploying sets of components (as defined in the template) as part of the initial Greengrass V2 deployment as well as subsequent deployment updates
- Fleet wide view of template versions deployed, as well as deployment status
- Optional integration with the CDF Asset Library allowing Asset Library devices, groups, and/or search queries to be the target of deployments
- End to end integration tests, including the auto-provisioning of a Greengrass core to be used as part of testing

The [Greengrass V2 Installer Config Generator module](../greengrass2-installer-config-generators/README.md) provides reference implementations of how to generate the installer configuration files for [manual provisioning](https://docs.aws.amazon.com/greengrass/v2/developerguide/quick-installation.html) and [fleet provisioning](https://docs.aws.amazon.com/greengrass/v2/developerguide/fleet-provisioning.html) as described in the AWS Greengrass V2 Developer Guide.

The [Device Patcher module](../device-patcher/README.md) can be used for the initial installation and configuration of the physical Greengrass V2 core and client devices.


## Pre-requisites

This module utilizes the [Provisioning module](../provisioning/README.md) to perform the actual provisioning which will be automatically installed by the [Installer module](../installer/README.md) when this module has been selected for install. [Provisioning templates](../provisioning/docs/provisioning-templates.md) are used to define how a core and/or client device should be provisioned. A provisioning template must be configured and uploaded to S3 to be referenced by the walkthrough below.

An example of a provisioning template that can be used to provision a Thing to represent a Greengrass V2 core is as follows. This template will accept `Parameters.ThingName` as a parameter. As the `CDF.createDeviceCertificate` option is set to `true`, a certificate will be created on behalf of the device with it automatically setting the `Parameters.CertificatePem` and `Parameters.CaCertificatePem` values which is a convineince for development / testing, but if using this in a production environment the recommended (most secure option) of registering device would be to remove `CDF.createDeviceCertificate`, `

```xml
{
    "Parameters": {
        "ThingName": {
            "Type": "String"
        },
        "CertificatePem": {
            "Type": "String"
        },
        "CaCertificatePem": {
            "Type": "String"
        }
    },
    "Resources": {
        "thing": {
            "Type": "AWS::IoT::Thing",
            "Properties": {
                "ThingName": {
                    "Ref": "ThingName"
                }
            },
            "OverrideSettings": {
                "ThingTypeName": "REPLACE"
            }
        },
        "certificate": {
            "Type": "AWS::IoT::Certificate",
            "Properties": {
                "CACertificatePem": {
                    "Ref": "CaCertificatePem"
                },
                "CertificatePem": {
                    "Ref": "CertificatePem"
                },
                "Status": "ACTIVE"
            },
            "OverrideSettings": {
                "Status": "REPLACE"
            }
        },
        "policy": {
            "Type": "AWS::IoT::Policy",
            "Properties": {
                "PolicyName": "CDFGreengrass2CorePolicy"
            }
        }
    },
    
    "CDF": {
        "createDeviceCertificate": true,
        "attachAdditionalPolicies": [{
            "name": "myTokenExchangeRoleAliasPolicy"
        }]
    }
}
```

## Walkthrough

Refer to the [swagger](docs/swagger.yml) as you progress through this walkthrough to understand the options of the various steps involved.

### Provision a core

The following REST call will provision a core (registers a thing, creates and associate a certificate, associate the multiple policies required, and creates the Greengrass installer config).

Replacing the following tokens in the example:

- `<core-name>` - the name of the GG2 core to create
- `<provisioning-template>` - the name of the provisioning template to use.
- `<ca-id>` - The CA certificate identifier

#### Request

```sh
POST /coreTasks
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "coreVersion": "2.5.0",
  "type": "Create",
  "cores": [
    {
      "name": "<core-name>",
      "provisioningTemplate": "<provisioning-template>",
      "provisioningParameters": {
        "ThingName": "<core-name>"
      },
      "cdfProvisioningParameters": {
        "caId": "<ca-id>",
        "certInfo": {
          "country": "US"
        }
      },
      "configFileGenerator": "MANUAL_INSTALL"
    }
  ]
}
```

#### Response
```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /coreTasks/<taskId>
x-taskid: <taskId>
```

***

As this request is asynchronous (depending on how many need to be created, may take longer than API Gateway execution limit), a task is created which batches, queues and fans out the cores to be created. The response will return the header `x-taskid` to identify the task.

Using the `x-taskid`, retrieve the status of the task:


#### Request

```sh
GET /coreTasks/<taskId>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```

#### Response

```sh
{
    "id": "<taskId>",
    "coreVersion": "2.5.0",
    "cores": [
        {
            "name": "<coreName>",
            "taskStatus": "Success",
            "createdAt": "<createdTime>",
            "updatedAt": "2022-01-14T06:58:11.157Z"
        }
    ],
    "taskStatus": "Success",
    "createdAt": "<subTaskCreatedTime>",
    "updatedAt": "<subTaskUpdatedTime>",
    "type": "Create"
}
```
***

Once the core task has completed successfully, you can retrieve its details:

Replace `<core-name>` with the name of the core.


```sh
GET /cores/<core-name>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```

#### Response


```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "name": "<core-name>",
    "artifacts": {
        "certs": {
            "bucket": "<artifact-bucket>",
            "key": "<artifact-prefix>/certs.zip",
            "createdAt": "<certificate-creation-time>"
        },
        "config": {
            "bucket": "<artifact-bucket>",
            "key": "<artifact-prefix>/installerConfig.yml",
            "createdAt": "<configuration-creation-time>"
        }
    },
    "device": {
        "installedComponents": [],
        "effectiveDeployments": [],
        "status": "UNKNOWN"
    },
    "template": {
        "desired": {
            "name": "None",
            "version": 0
        },
        "reported": {
            "name": "None",
            "version": 0,
            "deploymentStatus": "None"
        }
    },
    "createdAt": "<core-created-time>",
    "updatedAt": "<core-updated-time>"
}
```

***

### Create a Template

A template is what defines what components should be deployed to a Greengrass2 core device. The following will define a very simple template which will deploy the Greengrass2 Cli to the core.

Replace `<template-name>` with the name of the template.

**NOTE: The template name is used as part of creating a thing group name, thing group applies limitation on how the name can be defined. Refer to the points below for quick reference and refer to the link  on the thing group naming convention from the developer document**
[Thing Group Developer Document](https://docs.aws.amazon.com/iot/latest/developerguide/thing-groups.html)

```
- Thing group names can't contain international characters, such as û, é and ñ.
- You should not use personally identifiable information in your thing group name. The thing group name can appear in unencrypted communications and reports.
- You should not use a colon character ( : ) in a thing group name. The colon character is used as a delimiter by other AWS IoT services and this can cause them to parse strings with thing group names incorrectly. 
```

#### Request

```sh
POST /templates
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "name": "<template-name>",
  "components": [
    {
      "key": "aws.greengrass.Cli",
      "version": "2.5.0"
    }
  ]
}
```

#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /templates/<template-name>
```

***

Once created, run the following to view a template:

Replace `<template-name>` with the name of the template.

#### Request

```sh
GET /templates/<template-name>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```

#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "name": "<template-name>",
    "version": 1,
    "components": [
        {
            "key": "aws.greengrass.Cli",
            "version": "2.4.0"
        }
    ],
    "createdAt": "<created-time>",
    "updatedAt": null
}

```

***

### Power on the core

Before a GG2 deployment can be executed, the core itself must be powered on to allow it to self-register with the Greengrass2 platform. The steps defined in [Grreengrass V2 Provisioning Integration Testing](<docs/integration-testing.md>) can be used to setup a Greengrass2 core device on EC2 for testing.

After powering on the core, you can verify that it has been successfully registered with the Greengrass2 platform by running the following to check its status (once connected `device.status` will be reported as `HEALTHY`):

#### Request
```sh
GET /cores/<core-name>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```

#### Response
```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "name": "<coreName>",
    "artifacts": {
        "certs": {
            "bucket": "<artifact-bucket>",
            "key": "<artifact-prefix>/certs.zip",
            "createdAt": "<certificate-creation-time>"
        },
        "config": {
            "bucket": "<artifact-bucket>",
            "key": "<artifact-prefix>/installerConfig.yml",
            "createdAt": "<configuration-creation-time>"
        }
    },
    "device": {
        "installedComponents": [],
        "effectiveDeployments": [],
        "status": "HEALTHY"
    },
    "template": {
        "desired": {
            "name": "None",
            "version": 0
        },
        "reported": {
            "name": "None",
            "version": 0,
            "deploymentStatus": "None"
        }
    },
    "createdAt": "<core-created-time>",
    "updatedAt": "<core-updated-time>"
}
```

### Create a deployment task

A deployment task is what takes the components defined in the template and create a Greengrass2 deployment job. As this can take time, is an asynchronous process, with the response header `x-taskId` identifying the task.

Replace the following:
- `<template-name>` with the name of the template.
- `<core-name>` with the name of the core.


#### Request

```sh
POST /deploymentTasks
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "template": {
    "name": "<template-name>"
    "version" : "<template-version>"
  },
  "targets": {
    "thingNames": [
      "<core-name>"
    ]
  }
}
```

#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /deploymentTasks/<taskId>
x-taskid: <taskId>
```

***

To view the status of the deployment task using the `x-taskId` as `<taskId>`:

#### Request
```sh
GET /deploymentTasks/<taskId>
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```

#### Response
```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "id": "<taskId>",
    "template": {
        "name": "<template-name>",
        "version": 1
    },
    "targets": {
        "thingNames": [
            "<thing-name>"
        ]
    },
    "deployments": [
        {
            "coreName": "<thing-name>",
            "taskStatus": "Success",
            "createdAt": "<subtask-created-time>",
            "updatedAt": "<subtask-updated-time>"
        }
    ],
    "taskStatus": "Success",
    "createdAt": "<task-created-time>",
    "updatedAt": "<task-updated-time>"
    "batchesComplete": 1,
    "batchesTotal": 1
}
```
### View Fleet Summary

This service allows you to view what templates are running on the devices across the fleet.

```sh
GET /fleet/summary
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json
```


```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "templates": {
        "<template-name>": {
            "latestVersion": 1,
            "versions": {
                "1": {
                    "desiredInUse": 1,
                    "reportedInUse": 1,
                    "lastDeploymentSuccess": 1,
                    "lastDeploymentFailed": 0,
                    "lastDeploymentInProgress": 0
                }
            }
        }
    }
}
```

### Provision Client Devices

Make following REST call to create greengrass v2 client devices (register a thing, create and associate a certificate, associate the multiple policies required, and associate it with Greengrass core), replacing the following tokens.

- `<core-name>` - the name of the GG2 core to associate
- `<device-name>` - the name of the GG2 client device to create
- `<provisioning-template>` - the name of the provisioning template to use.
- `<ca-id>` - The CA certificate identifier

```sh
POST /cores/<core-name>/deviceTasks
Accept: application/vnd.aws-cdf-v1.0+json
Content-Type: application/vnd.aws-cdf-v1.0+json

{
  "types" : "Create"
  "devices": [
      {
          "name": "<client-device-name>",
          "provisioningTemplate": "<template-name>",
          "provisioningParameters": {
              "ThingName": "<client-device-name>"
          },
          "cdfProvisioningParameters": {
              "caId": "<ca-id>",
              "certInfo": {
                  "country": "US"
              }
          }
      }
  ]
}
```

 #### Response
```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /deviceTasks/<taskId>
x-taskid: <taskId>
```
The taskId returned in the header can be used to poll the progress of the task

***

To view the status of client devices, query the deviceTasks endpoint with the taskId

#### Request

```sh
GET /deviceTasks/<taskId>

Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

```

#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "id": "<task-id>",
    "coreName": "<core-name>",
    "devices": [
        {
            "name": "<client-device-name>",
            "taskStatus": "Success",
            "createdAt": "<subtask-created-time>",
            "updatedAt": "<subtask-updated-time>"
        }
    ],
    "taskStatus": "Success",
    "createdAt": "<task-created-time>",
    "updatedAt": "<task-updated-time>"
    "type": "Create"
}
```

### Delete a client device

You can delete client device, replacing the following tokens

- `<core-name>` - the name of the GG2 client device to delete
- `<deprovision>` - Boolean value to indicate if we need remove the client device from IoT Core
- `<diassociate-device-from-core>` - Boolean value to indicate if want to disassociate the client device from greengrass core

#### Request

```sh
DELETE devices/<client-device-name>?deprovision=<deprovision>&disassociateDeviceFromCore=<disassociate-device-from-core>

Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

```

#### Response

```sh
Status: 204
Content-Type: application/vnd.aws-cdf-v1.0+json
```

### Delete a core

Make following REST call to delete a core (disassociate client devices, optionally delete client devices, optionally deprovision core form IoT Core ), replacing the following tokens

- `<core-name>` - the name of the GG2 core to create
- `<provisioning-template>` - the name of the provisioning template to use. If using the default cdf implementation, `` can be used for testing which is included with `cdf-infrastructure-demo`
- `<deprovision-core>` - Boolean value to indicate if we need remove the core from IoT Core
- `<deprovision-client-devices>` - Boolean value to indicate if we need to remove client devices from IoT Core

#### Request

```sh
POST /coreTasks
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
    "type": "Delete",
    "options": {
        "deprovisionCores": <deprovision-core>,
        "deprovisionClientDevices": <deprovision-client-devices>
    },
    "coreVersion": "2.5.0"
    "cores": [
        {
            "name": "<core-name>",
            "provisioningTemplate": "<provisioning-template>"
        }
    ]
}
```
#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json
location: /coreTasks/<taskId>
x-taskid: <taskId>
```

***

Similar with CoreTask for creating Greengrass core, the response includes x-taskid in the header which you can use to poll the status of the task
#### Request

```sh
GET cores/<core-name>/coreTasks/<taskId>

Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

```

#### Response

```sh
Content-Type: application/vnd.aws-cdf-v1.0+json

{
    "id": "<task-id>",
    "coreVersion": "2.4.0",
    "cores": [
        {
            "name": "<core-name>",
            "taskStatus": "Success",
            "createdAt": "<subtask-created-time>",
            "updatedAt": "<subtask-updated-time>"
        }
    ],
    "taskStatus": "Success",
    "createdAt": "<task-created-time>",
    "updatedAt": "<task-updated-time>"
    "type": "Delete",
    "options": {
        "deprovisionClientDevices": true,
        "deprovisionCores": true
    }
}
```

## Events

As part of the installation you enable the event publishing feature of the module by answering `Yes` to the wizard question `Do you want the module to publish all operation events to CDF EventBridge?`, when this is set to true, all events will be publish to CDF EventBridge.

To subscribe to events published by CDF greengrass2-provisioning module, create an EventBridge rule with the pattern specified below:

```json
{
  "source": ["com.aws.cdf.greengrass2-provisioning"],
  "detail-type" : [<look at the list below>]
}
```

Here is the list of `detail-type` that are available if you want to filter out the events on a specific events

| detail-type                  | Description                                      |
| ---------------------------- | ------------------------------------------------ |
| Core Created Event           | A new greengrass2 core is created                |
| Core Deleted Event           | A greengrass2 core is deleted                    |
| Core Template Updated Event  | A template had been deployed to greengrass2 core |
| Device Created Event         | A greengrass client device is created            |
| Device Deleted Event         | A greengrass client device is deleted            |
| DeploymentTask Created Event | A deploymentTask is created                      |
| DeploymentTask Deleted Event | A deploymentTask is deleted                      |


## Additional Links
- [High level architecture](docs/README.md)
- [Application configuration](docs/configuration.md)
- [Swagger](docs/swagger.yml)
