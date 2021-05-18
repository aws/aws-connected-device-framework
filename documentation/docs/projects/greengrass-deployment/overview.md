# GREENGRASS AGENTBASED CORE DEPLOYMENTS OVERVIEW

## Introduction

The _Greengrass Deployment_ service provides a scalable way to deploy greengrass core software to an actual physical device.

The service utilizes SSM to activate the device as a hybrid instance and creates state manager assocations which run Ansible playbooks to remotely configure and install the greengrass core software on the physical device.

## Pre-requisites
To successfully deploy greengrass core software on the device. There are a few pre-requisits that must be met.

+ Greengrass group successfully deployed
+ Greengrass Core Associated with the group
+ Ansible Playbook stored in S3 for SSM State Manager
+ SSM Agent, Ansible and any other device side dependencies such as (Python or Node) on the device.

## Walkthrough
The following represents a typical walkthrough. Refer to the swagger for further details about each API and their options.

### Step 1: Define a Core deployment template
In order to deploy a Core, the first step is to create a Core deployment template. The template represents the configuration
required to be used by the target deployment.

#### REQUEST

```bash
PUT /deploymentTemplates/<template_name> HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
	"description": "Linux GG Core installation template",
	"type": "agentbased",
    "source": {
        "type": "s3",
    	"bucket":"cdf-876972130410-us-west-2",
    	"prefix":"greengrass-deployment/facility-controller/fc-ansible-gginstall.yaml"
    }
}
```

#### RESPONSE

```json
{
    "name": "<template_name>",
    "source": {
        "type": "s3",
        "bucket": "cdf-876972130410-us-east-1",
        "prefix": "greengrass-deployment/facility-controller/fc-ansible-gginstall.yaml"
    },
    "type": "agentbased",
    "versionNo": 1,
    "createdAt": "2020-06-04T01:42:18.804Z",
    "updatedAt": "2020-06-04T01:42:18.804Z",
    "enabled": true,
    "description": "Linux GG Core installation template"
}
```

All templates are versioned within the system. The first PUT call will create the template, whereas subsequent PUT's will update it.

### Step 2: Create a new device activation 

Once a device is ready to be deployed. The device needs to be activated. This step creates a device activation in SSM which allows the device to establish an identity.

#### REQUEST
```bash
POST /devices/my-test-core-id/activations HTTP/1.1
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

### Step 3: Activate the device 

After generating the activation Code, this code is passed on to the target device which is running the ssm-agent. The agent will receive the activation code and register itself 
with SSM. At this point the device will have a presence in SSM Service and can be managed remotely.

### Step 4: Deploy the core software on the device

Upon successfully activating the device, The core deployment step can be executed. The following request will create a new SSM State Manager Association which will execute Ansible playbook on the device itself.

This particular endpoint is an asynchronous REST API. The deployment gets queued which is processed at a later time. 

#### REQUEST
```bash
POST /devices/my-test-core-id/deployments HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json

{
    "deviceId": "my-test-core-id",
    "deploymentTemplateName": "my-template"
}
```

#### RESPONSE

```json
{
    "deviceId": "my-test-core-id",
    "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
    "createdAt": "2020-06-11T01:41:12.546Z",
    "updatedAt": "2020-06-11T01:41:12.546Z",
    "deploymentTemplateName": "my-template",
    "deploymentStatus": "pending",
    "deploymentType": "agentbased"
}
```

### Step 5: Check the deployment status

The Request in Step 4 return a deployment id which can be used to track the progress of the deployment.

#### REQUEST

```bash
GET /devices/my-test-core-id/deployments HTTP/1.1
Content-Type: application/vnd.aws-cdf-v1.0+json
Accept: application/vnd.aws-cdf-v1.0+json
``` 

#### RESPONSE

```json
{
    "deviceId": "my-test-core-id",
    "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
    "createdAt": "2020-06-11T01:41:12.546Z",
    "updatedAt": "2020-06-11T01:41:12.546Z",
    "deploymentTemplateName": "my-template",
    "deploymentStatus": "success",
    "deploymentType": "agentbased"
}
```

### OPTIONAL Step 6: Re-run a specific deployment

#### REQUEST

```bash
PATCH /devices/my-test-core-id/deployments/a1b83c20-ab84-11ea-9634-37cb5e1c09aa HTTP/1.1
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
