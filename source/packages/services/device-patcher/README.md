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

# Step 0: Host Machine Setup
The host machine or edge device needs to be connected to the internet and have the prequisites installed.
- [SSM Agent](https://docs.aws.amazon.com/systems-manager/latest/userguide/ssm-agent.html)
- [Ansible Agent](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)

> **NOTE:** If the host machine is an EC2 instance, then the steps defined in [Device Patcher Integration Testing](<docs/integration-testing.md>) can be used to create an AMI to launch an EC2 instance with pre-reqs installed.

### Step 1: Define a deployment template
In order to deploy an ansible Patch, the first step is to create a patch deployment template. The template specifies configuration for a particular patch. The payload has 2 main parts, the ansible playbook file and the `extraVars` to pass to the playbook itself. These `extraVars` should be common to all deployment patches. These can be overwritten when the actual deployment patch is created.

#### REQUEST

```bash
curl --location --request POST '<endpoint>/deploymentTemplates' \
    --header 'Content-Type: multipart/form-data' \
    --header 'Accept: application/vnd.aws-cdf-v1.0+json' \
    --form 'name="sampleTemplate"' \
    --form 'playbookFile=@"<path-to-playbook-file>"' \
    --form 'deploymentType="agentbased"' \
    --form 'description="Sample Patch Deployment Template"'
```

#### RESPONSE

```json
{
  "name": "sampleTemplate",
  "playbookName": "sample-playbook.yml",
  "playbookSource": {
    "bucket": "xxxxxxxxxxxxxx",
    "key": "device-patcher/playbooks/sampleTemplate___sample-playbook.yml"
  },
  "deploymentType": "agentbased",
  "versionNo": 1,
  "createdAt": "2022-04-14T20:48:47.410Z",
  "updatedAt": "2022-04-14T20:48:58.748Z",
  "enabled": true,
  "description": "Sample Patch Deployment Template updated"
}
```

All templates are versioned within the system. The first `POST` call will create the template, whereas subsequent `PATCH` will update it.

### Step 2: Activating the Device

In order to run a deployment job on the device first needs to be activated as a hybrid instance within SSM. This can be done by generating an activation code for the device and then following the steps to stop/register/start the SSM agent on the device itself. Since this step is done on the device itself, connectivity to the device is required. This is the only time when a physical connection between the device and host needs to be made. The API call below will generate the activation code which can be taken to activate the SSM agent. This step will allow this device to be activated as a Hybrid instance in SSM.

#### REQUEST
```bash
curl --location --request POST '<endpoint>/activations' \
--header 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
--header 'Accept: application/vnd.aws-cdf-v1.0+json' \
--data-raw '{
	"deviceId": "ggv2-test-core-1"
}'
```

#### RESPONSE
```json
{
    "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
    "activationCode": "nxj3IC1HBquDVxM14Oqo",
    "activationRegion": "us-east-1"
}
```

#### Step 2.1: Activate the Host Machine using the Activation Response from Step 2

In order to activate the device, the activation code needs to be passed to the device. This can be done by running the following command on the device:

```bash
# The following commands can be executed from the local machine on a host, provided the HOST endpoint, private key, and user allows the connection. 
# The second command below requires the "$ACTIVATION_CODE", "$ACTIVATION_ID" & "$ACTIVATION_REGION" be replaced with the values from the response from Step 2.

# If the communication with host is via SSH, then the following commands can be used:
ssh -i ${HOST_PRIVATE_KEY_PATH} ${HOST_USER}@${HOST_DNS_ENDPOINT} 'sudo systemctl stop amazon-ssm-agent'
ssh -i ${HOST_PRIVATE_KEY_PATH} ${HOST_USER}@${HOST_DNS_ENDPOINT} 'sudo -E amazon-ssm-agent -register -code "$ACTIVATION_CODE" -id "$ACTIVATION_ID" -region "$ACTIVATION_REGION" -clear'
ssh -i ${HOST_PRIVATE_KEY_PATH} ${HOST_USER}@${HOST_DNS_ENDPOINT} 'sudo systemctl start amazon-ssm-agent'

# If the commands need to be ran directly on the host:
> sudo systemctl stop amazon-ssm-agent
> sudo -E amazon-ssm-agent -register -code "$ACTIVATION_CODE" -id "$ACTIVATION_ID" -region "$ACTIVATION_REGION" -clear
> sudo systemctl start amazon-ssm-agent

# Refer this link to activate the SSM agent for different platforms: https://docs.aws.amazon.com/systems-manager/latest/userguide/sysman-install-managed-linux.html
```

### Step 3: Deploy the Patch (Ansible Playbook) to the device

Upon successfully activating the device, The patch deployment step can be executed. The following request will create a new SSM State Manager Association which will execute Ansible playbook on the device itself.

This particular endpoint is an asynchronous REST API. The deployment gets queued which is processed at a later time. The payload requires a list of deployments. The individual deployment has required properties such as deviceId, DeploymentTemplateName, and extraVars for overriding playbook parameters defined in the deployment template or unique to a particular deployment.

#### REQUEST
```bash
curl --location --request POST '<endpoint>/deploymentTasks' \
--header 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
--header 'Accept: application/vnd.aws-cdf-v1.0+json' \
--data-raw '{
    "deployments": [{
        "deviceId": "<device-identifier>",
        "deploymentTemplateName": "ggv2-ec2-installer-template",
        "extraVars":{
            "iot_device_config_url": "${aws:s3:presign:https://<bucket>/<prefix>?expiresIn=604800}",
            "iot_device_cred_zip_url": "${aws:s3:presign:https://<bucket>/<prefix>?expiresIn=604800}"
        }
    }]
}'
```

#### RESPONSE

```bash
HTTP: 200 OK
```

### Step 4: Check the deployment status

There are couple different ways the status of the deployment can be checked. If the status of the whole deployment task needs to be checked, then the following query can be made

#### REQUEST
```bash
# The {deploymentTaskId} can be obtained from the response Header from Step 3.

curl --location --request GET '<endpoint>/deploymentTasks/{deploymentTaskId}/deployments' \
--header 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
--header 'Accept: application/vnd.aws-cdf-v1.0+json'
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
curl --location --request GET '<endpoint>/devices/{deviceId}/deployments' \
--header 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
--header 'Accept: application/vnd.aws-cdf-v1.0+json'
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
curl --location --request PATCH '<endpoint>/deployments/{deploymentId}' \
--header 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
--header 'Accept: application/vnd.aws-cdf-v1.0+json' \
--data-raw '{
	"deploymentStatus": "retry"
}'
```

#### RESPONSE
```bash
HTTP: 200 OK
```

## Additional Links
- [Application configuration](docs/configuration.md)
- [High level architcture](infrastructure/README.md)
- [Swagger](docs/swagger.yaml)
