# Deployment

## Deployments Steps

Before attempting an upgrade, read [release notes](https://github.com/aws/aws-connected-device-framework/releases) and [migration notes](./migration.md) to verify changes.  

## Prerequisites

### Install tools

Ensure that all development and deployment [prerequisites](development/prerequisites.md) are installed on your deployment machine. This is a one-time setup to configure an environment for development and/or deployment.

### AWS CLI Credentials

The installer executes a number of aws commands (e.g, `aws cloudformation package`, `aws cloudformation deploy`) to upload artifacts and deploy the modules to the target account. Ensure that you have IAM credential with the right policies set up on your shell when running the scripts below. Create Named profile for IAM credential: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-profiles.html

### Backup and migrate existing data

If migrating from an existing to a more recent CDF release, the following items should be considered as a prerequisite:

* Take manual snapshots if you wish to retain the data of your Neptune database
* Migrate existing DynamoDB table data using the `dynamodb-migrator` tool

**Refer to the [migration](./migration.md) document for more detailed and step-by-step instructions on migration between major changes!**

### Other Prerequisites

* S3 Bucket for CDF resources
* S3 Bucket for CloudFormation resources (can be the same as above)
* Chosen REST API authentication mechanism (see below)

## Configure REST API authentication

Due to the myriad number of ways authentication may be configured for REST APIS's, CDF has taken the approach of externalizing the REST API security as CloudFormation template snippets which can be used as is, or modified to suit specific customer needs.  

The provided authentication options are as follows:

| Authentication Type | Cloudformation Template Snippet Name |
| :--- | :--- |
| No authentication | `cfn-apiGateway-noAuth.yaml` |
| API Key | `cfn-apiGateway-apiKeyAuth.yaml` |
| IAM | `cfn-apiGateway-iamAuth.yaml` |
| Lambda request authorizer | `cfn-apiGateway-lambdaRequestAuth.yaml` |
| Lambda token authorizer | `cfn-apiGateway-lambdaTokenAuth.yaml` |
| Private API gateway | `cfn-apiGateway-privateApi.yaml` |

The template snippets are located at `{aws-connected-device-framework}/source/infrastructure/cloudformation/snippets/`, which are uploaded to an S3 bucket as part of the aws-connected-device-framework deployment script.  

The name of the specific CloudFormation template snippet to define which authentication mechanism to use, including the _no authentication (cfn-apiGateway-noAuth.yaml)_ template snippet if none is required, must be provided to the [installer module](../packages/installer/README.md) as part of the deployment.

If you need to customize the authentication configuration, the recommendation is to copy one of the provided ones as a base, customize as required, then upload it to the configured S3 bucket as part of your deployment script.

If an authentication mechanism is applied to the CDF REST API's, a security perimeter comes into effect around all the core CDF modules.  A caller's credentials are validated upon the first entry point into the security boundary for a given request, with all following internal module to module calls for the same request bypassing additional authentication checks.  This is made possible by the provided clients for each of the REST API's (see `{aws-connected-device-framework}/source/packages/libraries/clients/`) that the core CDF modules use for inter-module communication.  They can be configured to call their associated REST API by invoking API Gateway, thus requiring to be authorized, or instead invoking the corresponding CDF core's lambda directly thus bypassing any authentication checks.  These clients may be reused within your own custom modules to expand the CDF security perimeter to include your custom modules too.

## Deploying the project

### Deploying from pre-bundled releases
Each github release comes with a pre-bundled release artifact that can be used to simplify the deployment.

Download the latest release tar files from [here](https://github.com/aws/aws-connected-device-framework/releases)

Run below step in the folder where you downloaded the tar file:

```shell
mkdir aws-connected-device-framework
tar -xvf aws-connected-device-framework.tar -C aws-connected-device-framework
cd aws-connected-device-framework/source
aws-connected-device-framework> rush update
```
**You can now skip to the `Deploying` step**

### Deploying from source
Alternatively you can choose to clone the source code to build and bundle them yourself.

**All the commands below should be run inside the source folder**

```shell
aws-connected-device-framework> cd source
```

#### Bundling

To build and bundle the modules, run the following command:

```shell
aws-connected-device-framework/source> rush bundle
```

### Deploying

After all the artifacts are bundled, you can use the [installer module](../packages/services/installer/README.md) to deploy the required DF modules.

```shell
> cdf-cli deploy <environment> <region>
```

### Additional Information

#### Existing VPC

If you're not specifying any existing networking information (Vpc Id, Subnets, etc) as part of the deploy step, a new VPC and necessary networking resources will be created, detailed information of the networking resources can be found [here](../../source/infrastructure/cloudformation/cfn-networking.yaml) 

#### Customer provided KMS Key

KMS will be created with the [default key policy](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html#key-policy-default), this default key policy has one policy statement that gives the AWS account (root user) that owns the CMK full access to the CMK and enables IAM policies in the account to allow access to the CMK.

This will allow IAM policies to control access to the CMK, below is the explanation from the [documentation](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html#key-policy-default-allow-root-enable-iam)

> Every CMK must have a key policy. You can also use IAM policies to control access to a CMK, but only if the key policy allows it. If the key policy doesn't allow it, IAM policies that attempt to control access to a CMK are ineffective.
>
> To allow IAM policies to control access to a CMK, the key policy must include a policy statement that gives the AWS account full access to the CMK, like the following one. For more information, see Managing access to AWS KMS CMKs.
