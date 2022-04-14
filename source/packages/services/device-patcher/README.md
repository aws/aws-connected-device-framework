# DEVICE PATCHER MODULE OVERVIEW

## Introduction

The _Device Patcher_ module provides a scalable way to patch a physical device by remotely executing Ansible playbooks on the device.

The module utilizes SSM to activate the device as a hybrid instance and creates state manager associations which run Ansible playbooks to remotely patch the software on the physical device.

## Walkthrough
The following represents step-by-step walkthrough to setup a Greengrass V2 core device on a EC2 instance. Refer to the [swagger](docs/swagger.yaml) for further details about each API and its options.

### Pre-requisites:
To successfully deploy Device Patcher software on the device there are a few pre-requisites that must be met.

+ Ansible Playbook stored in [S3](https://aws.amazon.com/s3/) for [SSM State Manager](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-state.html)
+ [SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html) installed on the device/instance 
+ Ansible Agent installed on the device/instance

### Step 1: Define a deployment template
In order to deploy a Greengrass V2 core device, the first step is to create a deployment template. The template specifies configuration for a particular deployment. The payload has 2 main parts, the source of where the playbook is referenced from a S3 bucket and the `extraVars` to pass to the playbook itself. These `extraVars` should be common to all deployment jobs. These can be overwritten when the actual deployment job is created.

#### REQUEST

```bash
PUT /deploymentTemplates/<template_name> HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
    "description": "EC2 GGV2 Core installation template",
    "type": "agentbased",
    "source": {
        "type": "s3",
    	"bucket":"cdf-xxxxxxxxxxxx-us-west-2",
    	"prefix":"device-patcher/playbooks/ggv2-ec2-amazonlinux2-installer.yml"
    }
}
```

#### RESPONSE

```json
{
    "name": "<template_name>",
    "source": {
        "type": "s3",
        "bucket": "cdf-xxxxxxxxxxxx-us-east-1",
        "prefix": "device-patcher/playbooks/ggv2-ec2-amazonlinux2-installer-playbook.yml"
    },
    "type": "agentbased",
    "versionNo": 1,
    "createdAt": "2020-06-04T01:42:18.804Z",
    "updatedAt": "2020-06-04T01:42:18.804Z",
    "enabled": true,
    "description": "EC2 GGV2 Core installation template"
}
```

All templates are versioned within the system. The first `PUT` call will create the template, whereas subsequent `PUT`'s will update it.

### Step 2: Activating the Device

In order to run a deployment job on the device first needs to be activated as a hybrid instance within SSM. This can be done by generating an activation code for the device and then following the steps to stop/register/start the SSM agent on the device itself. Since this step is done on the device itself, connectivity to the device is required. This is the only time when a physical connection between the device and host needs to be made. The API call below will generate the activation code which can be taken to activate the SSM agent. This step will allow this device to be activated as a Hybrid instance in SSM.

#### REQUEST
```bash
POST /activations HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
    "deviceId": <my-test-core-id>
}
```

#### RESPONSE
```json
{
    "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
    "activationCode": "nxj3IC1HBquDVxM14Oqo",
    "activationRegion": "us-east-1"
}
```

### Step 3: Deploy the Patch (Ansible Playbook) to the device

Upon successfully activating the device, The core deployment step can be executed. The following request will create a new SSM State Manager Association which will execute Ansible playbook on the device itself.

This particular endpoint is an asynchronous REST API. The deployment gets queued which is processed at a later time. The payload requires a list of deployments. The individual deployment has required properties such as deviceId, DeploymentTemplateName, and extraVars for overriding playbook parameters defined in the deployment template or unique to a particular deployment.

#### REQUEST
```bash
POST /deploymentTasks HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
    "deployments": [{
        "deviceId": "ec2-ggv2core-device1",
        "deploymentTemplateName": "ggv2-ec2-installer-template",
        "extraVars":{
          "iot_device_cred_zip_url": "${aws:s3:presign:https://<bucket><prefix>?expiresIn=604800}",
          "iot_device_config_url": "${aws:s3:presign:https://<bucket><preix>?expiresIn=604800}"
        }
    }]
}
```

#### RESPONSE

```bash
HTTP: 200 OK
```

### Step 4: Check the deployment status

There are couple different ways the status of the deployment can be checked. If the status of the whole deployment task needs to be checked, then the following query can be made

#### REQUEST
```bash
GET /deploymentTasks/{taskId}/deployments HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json
```

#### RESPONSE

```json
{
    "deployments": [
        {
            "deviceId": "ec2-ggv2core-device1",
            "deploymentId": "2eb2dbc0-62e1-11ec-b3fe-919bdd9a87d1",
            "taskId": "2e7c6270-62e1-11ec-b3fe-919bdd9a87d1",
            "createdAt": "2021-12-22T04:39:43.228Z",
            "updatedAt": "2021-12-22T04:39:55.017Z",
            "deploymentTemplateName": "sample-playbook-template",
            "deploymentStatus": "pending",
            "deploymentType": "agentbased",
            "statusMessage": "SSM:InProgress",
            "extraVars": {
              "iot_device_cred_zip_url": "${aws:s3:presign:https://cdf-xxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/certs.zip?expiresIn=604800}",
              "iot_device_config_url": "${aws:s3:presign:https://cdf-xxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/installerConfig.yml?expiresIn=604800}"
            },
            "associationId": "b919b476-e507-49fd-a963-b5e0076daa8b"
        },
        {
            "deviceId": "ec2-ggv2core-device1",
            "deploymentId": "52240a20-62e1-11ec-b3fe-919bdd9a87d1",
            "taskId": "51de75a0-62e1-11ec-b3fe-919bdd9a87d1",
            "createdAt": "2021-12-22T04:40:42.690Z",
            "updatedAt": "2021-12-22T17:24:33.818Z",
            "deploymentTemplateName": "ggv2-ec2-installer-template",
            "deploymentStatus": "failed",
            "deploymentType": "agentbased",
            "statusMessage": "SSM:Failed",
            "extraVars": {
              "iot_device_cred_zip_url": "${aws:s3:presign:https://cdf-xxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/certs.zip?expiresIn=604800}",
              "iot_device_config_url": "${aws:s3:presign:https://cdf-xxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/installerConfig.yml?expiresIn=604800}"
            },
            "associationId": "032bbe91-281e-46eb-9f3f-564180a9eda3"
        }
    ]
}
```

If the deployment for a particular device needs to be checked, then the following query can be made to retrieve the deployment for a particular device

#### REQUEST
```bash
GET /devices/{deviceId}/deployments HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json
```

#### RESPONSE

```json
{
  "deployments": [
    {
      "deviceId": "ec2-ggv2core-device1",
      "deploymentId": "2eb2dbc0-62e1-11ec-b3fe-919bdd9a87d1",
      "taskId": "2e7c6270-62e1-11ec-b3fe-919bdd9a87d1",
      "createdAt": "2021-12-22T04:39:43.228Z",
      "updatedAt": "2021-12-22T04:39:55.017Z",
      "deploymentTemplateName": "sample-playbook-template",
      "deploymentStatus": "pending",
      "deploymentType": "agentbased",
      "statusMessage": "SSM:InProgress",
      "extraVars": {
        "iot_device_cred_zip_url": "${aws:s3:presign:https://cdf-xxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/certs.zip?expiresIn=604800}",
        "iot_device_config_url": "${aws:s3:presign:https://cdf-xxxxxxxxxxx-us-west-2/greengrass2/artifacts/ggv2-test-core-1/installerConfig.yml?expiresIn=604800}"
      },
      "associationId": "b919b476-e507-49fd-a963-b5e0076daa8b"
    }
  ]
}
```

### OPTIONAL Step 5: Re-run a specific deployment

#### REQUEST

```bash
PATCH /deployments/{deploymentId} HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
	"deploymentStatus": "retry"
}
```

#### RESPONSE
```bash
HTTP: 200 OK
```

## Additional Links
- [Application configuration](docs/configuration.md)
- [High level architcture](infrastructure/README.md)
- [Swagger](docs/swagger.yaml)
