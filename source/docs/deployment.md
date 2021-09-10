# Deployment

## TL;DR - Deployments Steps

Before attempting an upgrade, read [breaking changes](../docs/breaking-changes.md) which details any major release information such as backwards incompatible changes.  

1. Installing prerequisites
2. Defining the configuration
3. Configure REST API authentication
4. Deploying the chosen modules

## Installing prerequisites

The following is a one-time setup to configure an environment for development and/or deployment:

If migrating from an existing to a more recent CDF release, the following items should be considered as a prerequisite:
- Take manual snapshots if you wish to retain the data of your Neptune database
- Migrate existing DynamoDB table data using the "cdf-dynamodb-migrator"

**Refer to the [migration](./migration.md) document for more detailed and step-by-step instructions on migration**

Install the listed [prerequisites](development/prequisities.md).

## Defining the configuration

Follow the documentation on [Application Configuration](./application-configuration.md) to prepare the necessary configuration for each module.

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

The name of the specific CloudFormation template snippet to define which authentication mechanism to use, including the _no authentication (cfn-apiGateway-noAuth.yaml)_ template snippet if none is required, must be provided to the deployment script by means of the following 2 parameters:

```shell script
MANDATORY ARGUMENTS:
====================
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

```

If you need to customize the authentication configuration, the recommendation is to copy one of the provided ones as a base, customize as required, then upload it to the configured S3 bucket as part of your deployment script.

If an authentication mechanism is applied to the CDF REST API's, a security perimiter comes into effect around all the core CDF modules.  A caller's credentials are validated upon the first entry point into the security boundary for a given request, with all following internal module to module calls for the same request bypassing additional authentication checks.  This is made possible by the provided clients for each of the REST API's (see `{aws-connected-device-framework}/source/packages/libraries/clients/`) that the core CDF modules use for inter-module communication.  They can be configured to call their associated REST API by invoking API Gateway, thus requiring to be authorized, or instead invoking the corresponding CDF core's lambda directly thus bypassing any authentication checks.  These clients may be resued within your own custom modules to expand the CDF security perimiter to include your custom modules too.

## Deploying the project

### Deployment Prequisites

* EC2 Keypair
* S3 Bucket for CDF resources
* S3 Bucket for CloudFormation resources (can be the same as above)
* Chosen REST API authentication mechanism
* AWS Profile configured in CLI to target the correct account

**All the commands below should be run inside the source folder**

```bash
$ cd source
```
### Bundling

**To build and bundle the modules, run the following command:**

```bash
$ rush bundle
```

### Deploying

After all the artifacts are bundled, you can now deploy cdf core modules either as **single** cloudformation stack or **multiple** cloudformation stack (one stack per micro-service).

**Note:** If application configuration project location is not provided as a parameter, all cdf modules will be deployed.

#### Deploying CDF core modules in single stack (with nested children stacks) mode 

```bash
./infrastructure/deploy-core-single-stack.bash
    -e {env-name} 
    -b {s3-bucket-name} 
    -c {infrastructure-project-location}
    -p {keypair-name}
    -R {region} 
    -P {aws_cli_profile}
    -y s3://{s3-bucket-name}/template-snippets/
    -i {allowed CIDR range to access bastion host}
    -B 
```

**Example of the CDF deploy-core-single-stack.bash arguments:**

```bash
$ ./infrastructure/deploy-core-single-stack.bash 
    -e development
    -b cdf-deployment
    -p cdf-ec2-keypair 
    -R eu-west-1 
    -P dev
    -y s3://cdf-deployment/template-snippets/ 
    -i 0.0.0.0/0 
    -K johndoe
    -B 
```
#### Deploying CDF Core in multiple stack mode

```bash
./infrastructure/deploy-core.bash 
    -e {env-name} 
    -b {s3-bucket-name} 
    -p {keypair-name}
    -R {region} 
    -P {aws_cli_profile}
    -y s3://{s3-bucket-name}/template-snippets/
    -i {allowed CIDR range to access bastion host}
    -B 
```

**Example of the CDF deploy-core.bash arguments:**

```bash
$ ./infrastructure/deploy-core.bash 
    -e development
    -b cdf-deployment
    -p cdf-ec2-keypair 
    -R eu-west-1 
    -P dev
    -y s3://cdf-deployment/template-snippets/ 
    -i 0.0.0.0/0 
    -K johndoe
    -B 
```

### Additional Information

#### Existing VPC

If you're not specifying any existing networking information (Vpc Id, Subnets, etc) as part of the deploy step, a new VPC and necessary networking resources will be created, detailed information of the networking resources can be found [here](../../source/infrastructure/cloudformation/cfn-networking.yaml) 

#### Customer provided KMS Key

KMS will be created with the [default key policy](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html#key-policy-default), this default key policy has one policy statement that gives the AWS account (root user) that owns the CMK full access to the CMK and enables IAM policies in the account to allow access to the CMK.

This will allow IAM policies to control access to the CMK, below is the explanation from the [documentation](https://docs.aws.amazon.com/kms/latest/developerguide/key-policies.html#key-policy-default-allow-root-enable-iam)
```
Every CMK must have a key policy. You can also use IAM policies to control access to a CMK, but only if the key policy allows it. If the key policy doesn't allow it, IAM policies that attempt to control access to a CMK are ineffecti

To allow IAM policies to control access to a CMK, the key policy must include a policy statement that gives the AWS account full access to the CMK, like the following one. For more information, see Managing access to AWS KMS CMKs.
```

