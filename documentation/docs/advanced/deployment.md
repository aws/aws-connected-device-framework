# Deployment

Note: These instructions reflect the _rush_ based build system which was introduced from version _cdf-core-20210119*.tar_. If you need to use the older _pnpm_ based build system for prior versions, refer to the releases accompanying versioned documentation.

## TL;DR - Deployments Steps

Before attempting an upgrade, read [releases](../releases/releases.md) which details any major release information such as backwards incompatible changes.  

1. Download pre-bundled platform dependencies (_cdf-core_)
2. Clone and include customer specific _cdf-facade-*_ and _cdf-infrastructure-*_ projects
    1. CDF Auto Facade and Infrastructure (the new preferred demo)
    2. CDF Demo Facade and Infrastructure (the original demo)
3. Optionally configure REST API authentication
4. Deploying the project
    
## Downloading pre-bundled platform dependencies (cdf-core)

Ensure you have installed the necessary [pre-reqs](#installing-prerequisites) to configure your environment.

After a fix/feature is tested, releases are automatically bundled and available at _s3://cdf-157731826412-us-west-2/releases_ for download and installation.

To start, retrieve a list of the available releases as follows:

```sh
> aws s3 ls s3://cdf-157731826412-us-west-2/releases/core/

2019-03-16 16:27:33  343978991 cdf-core-##############.tar
```

Download and extract the _cdf-core-*_ release using the name of the files from the previous step:

```sh
> aws s3 cp s3://cdf-157731826412-us-west-2/releases/core/cdf-core-##############.tar .
> mkdir cdf-core
> tar -xf cdf-core-##############.tar -C cdf-core
```

Along with the _cdf-core_ release package, a _cdf-infrastructure-*_ and _cdf-facade-*_ project need cloning to the same parent directory as described in the next step.  

## Clone and include _cdf-facade-\*_ and _cdf-infrastructure-\*_ projects

The _cdf-infrastructure-*_ project contains configuration which is used during the deploy. This project contains a directory per service, which contains an configuration file per environment CDF is to be deployed to (the environment parameter passed into the deploy command). 

The presence of a configuration file for a specific environment denotes to the core CDF installation scripts that this service is to be deployed.  The absence implies that it should not be deployed.  Note however that a customer's specific deployment script in their _cdf-infrastructure-*_ package may be performing its own checks too as an intitial validiation of what services need to be deployed.

Some of the configuration values are automatically populated during the deployment. For instance AWS IoT and API Gateway endpoints. However, the S3 bucket configuration is not auto populated and needs to be configured before the first deployment.

Edit the S3 bucket values in the configuration files to match the S3 bucket in the AWS account used for the deploy. Below is an example of the bulkcertificates file however multiple configuration files need to be updated including:

* bulkcerts
* certificateactivator
* certificatevendor
* commands
* provisioning

`(cdf-infrastructure-demo/bulkcertificates/demo-config.json)`

```json
{
  "aws": {
    "s3": {
      "certificates": {
        "bucket": "UPDATE THIS TO MATCH THE DESIRED BUCKET IN THE DEPLOYMENT AWS ACCOUNT",
        "prefix": "certificates/"
      }
    }
  }
}
```

**Note:** To learn more about the functionality of the individual Facade Projects, checkout the [CDF Facade Overview document](../projects/facade/overview.md).

#### CDF Auto Facade and Infrastructure

The following is an example of how to clone the cdf auto projects:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-facade-auto
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-infrastructure-auto
```


#### CDF Demo Facade and Infrastructure

The following is an example of how to clone the cdf demo projects:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-facade-demo
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-infrastructure-demo
```

## Configuring REST API Authentication

Due to the myriad number of ways authentication may be configured for REST APIS's, CDF has taken the approach of externalizing the REST API Gateway as Cloudformation template snippets which can be used as is, or modified to suit customer needs.  

The provided authentication options are as follows:

| Authentication Type | Cloudformation Template Snippet Name |
| :--- | :--- |
| No authentication | `cfn-apiGateway-noAuth.yaml` |
| API Key | `cfn-apiGateway-apiKeyAuth.yaml` |
| IAM | `cfn-apiGateway-iamAuth.yaml` |
| Lambda request authorizer | `cfn-apiGateway-lambdaRequestAuth.yaml` |
| Lambda token authorizer | `cfn-apiGateway-lambdaTokenAuth.yaml` |
| Private API gateway | `cfn-apiGateway-privateApi.yaml` |

The template snippets are located at `{cdf-core}/infrastructure/cloudformation/snippets/`, which are uploaded to an S3 bucket as part of the CDF core deployment script.  

The name of the specific Cloudformation template snippet to define which authentication mechanism to use, including the _no authentication (cfn-apiGateway-noAuth.yaml)_ template snippet if none is required, must be provided to the deployment script by means of the following 2 parameters:

```shell script
MANDATORY ARGUMENTS:
====================
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

```

If you need to customize the authentication configuration, the recommendation is to copy one of the provided ones as a base, customize as required, then upload it to the configured S3 bucket as part of your deployment script.

If an authentication mechanism is applied to the CDF REST API's, a security perimiter comes into effect around all the core CDF services.  A caller's credentials are validated upon the first entry point into the security boundary for a given request, with all following internal service to service calls for the same request bypassing additional authentication checks.  This is made possible by the provided clients for each of the REST API's (see `{cdf-core}/packages/libraries/clients/`) that the core CDF services use for inter-service communication.  They can be configured to call their associated REST API by invoking API Gateway, thus requiring to be authorized, or instead invoking the corresponding CDF core's lambda directly thus bypassing any authentication checks.  These clients may be resued within your own custom services to expand the CDF security perimiter to include your custom services too.

## Deploying the project

#### Deployment Prequisites

* EC2 Keypair
* S3 Bucket for CDF Resources
* S3 Bucket for Cloudformation Resources (can be the same as above)
* Chosen REST API authentication mechanism
* AWS Profile configured in CLI to target the correct account

To deploy, run the _deploy.bash_ script from the _cdf-infrastructure-*_ project, e.g.:

```sh
> cd cdf-infrastructure-demo
cdf-infrastructure-demo> ./deploy.bash -C -e demo -p 157731826412 \
   -i 0.0.0.0/0 \
   -u cdf-157721836412-us-west-2 -b cdf-157721836412-us-west-2 \
   -R us-west-2 -P 1577

> cd cdf-infrastructure-demo
cdf-infrastructure-demo> ./deploy.bash -BC \
  -e deantest \
  -u cdf-157731826412-us-east-1 -b cdf-157731826412-us-east-1 \
  -p 157731826412 \
  -i 0.0.0.0/0 \
  -y 's3://cdf-157731826412-us-east-1/cfn/' -z 'cfn-apiGateway-apiKeyAuth.yaml' \
  -R us-east-1 -P deanhart-1577 
```

For a description of the arguments of the above script, run the script with no arguments as follows:

```sh
cdf-infrastructure-demo> ./deploy.bash
```

The `cdf-infrastructure-demo/deploy.bash` script is provided as an example of how to build your own deployment script.  The majority of the script take care of the boilerplate functionality such as displaying help message for available arguments, validation of arguments, and deploying the core CDF services.  However, you will need to copy and customize this script if you need to apply additional customer specific services such as lambda authorizers.  Review the scripts comments for further information.

## Tearing Down a Deployment

A helper script is provided that tears down all deployed services for a given environment by deleting all Cloudformation stacks that have a name matching the regular expression `^cdf-.*-${ENVIRONMENT}$`.  

**Use this with caution!!  It is not reversible!!  Only use during development / testing.**

To run....
```shell script
cdf-core> cd infrastructure
cdf-core/infrastructure> ./teardown-core.bash -e <environment> -R <aws_region> -P <aws-profile>
```

Again...  **Use this with caution!!  It is not reversible!!  Only use during development / testing.**

## Installing Prerequisites

The following is a one-time setup to configure an environment for development and/or deployment:

+ ensure you have a [git client](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
+ ensure you have [jq](https://stedolan.github.io/jq/) installed
+ install [Node Version Manager](https://github.com/creationix/nvm#install--update-script):


```sh
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh | bash
```

+ using nvm installed from the previous step, install Node.js v12.x:

```sh
> nvm use v12
```

+ install [rush](https://rushjs.io) monorepo manager:

```sh
> npm i -g @microsoft/rush
```

## FAQ

???+ question "I'm trying to run the _aws s3_ commands but it reports _Access Denied_"

    Your account must have access to the S3 bucket where the cdf-core releases are stored (currently bucket _cdf-157731826412-us-west-2_ located within account _1577-3182-6412_).  Do you have multiple accounts configured on your computer?  If so, you may need to indicate the specific profile to use by setting the _--profile_ attribute.
