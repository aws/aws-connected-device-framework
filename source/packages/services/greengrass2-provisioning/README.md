# CDF GREENGRASS V2 PROVISIONING

## INTRODUCTION

The `Greengrass V2 Provisioning` service provides these functionalities

* Provision 1 or more Greengrass V2 Cores
* Provision 1 or more Client Devices
* Associate Client Devices with Greengrass V2 Cores
* Create template, which represents greengrass components (and their relevant configuration)
* Deploy templates to one or more Greengrass V2 Cores



## Deployment

Follow the instruction [here](../installer/README.md#) to deploy Greengrass Version 2 Provisioning and Installer Configuration Services. The installer will automatically includes the `Provisioning` and `Asset Library` modules.


## Walkthrough

### Provision a core

Make the following REST call to provision a core (register a thing, create and associate a certificate, associate the multiple policies required, and creates the Greengrass installer config), replacing the following tokens

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

As this request is asynchronous (depending on how many need to be created, may take longer than API Gateway execution limit), a task is created. The response will return the header `x-taskid` to identify the task.

Using the `x-taskid`, view the status of the task:


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

Before a GG2 deployment can be executed, the core itself must be powered on to allow it to self-register with the Greengrass2 platform. The steps defined in [Grreengrass V2 Provisioning Integration Testing](<docs/integration-testing.md>) can be used to setup a Greengrass2 core device on EC2.

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



## Additional Links
- [High level architecture](docs/README.md)
- [Application configuration](docs/configuration.md)
- [Swagger](docs/swagger.yml)
