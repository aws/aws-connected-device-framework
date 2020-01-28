# Deployment

## TL;DR

## Deployments Steps
* Download pre-bundled platform dependencies (_cdf-core_, _cdf-clients_)
* Clone and include _cdf-facade-*_ and _cdf-infrastructure-*_ projects
    * CDF Auto Facade and Infrastructure (the new preferred demo)
    * CDF Demo Facade and Infrastructure (the old original dem)
* Deploying the project
    
    
## Downloading pre-bundled platform dependencies (cdf-core, cdf-clients)

Ensure you have installed the necessary [pre-reqs](#installing-prequisities) to configure your environment.

After a fix/feature is tested, releases are automatically bundled and available at _s3://cdf-157731826412-us-west-2/releases_ for downlooad and installation.  The core services (cdf-core) and clients/libraries (cdf-clients) are pre-bundled and released as two separate packages so as to reduce the download size for those only interested in consuming the clients, yet they exist as a single codebase in CodeCommit. 

To start, retrieve a list of the available releases as follows:

```sh
> aws s3 ls s3://cdf-157731826412-us-west-2/releases/core/

2019-03-16 16:27:33  343978991 cdf-core-##############.tar


> aws s3 ls s3://cdf-157731826412-us-west-2/releases/clients/

2019-03-16 16:27:33  343978991 cdf-clients-##############.tar
```

Download and extract the _cdf-core-*_ and _cdf-clients-*_ releases using the name of the files from the previous step:

```sh
> aws s3 cp s3://cdf-157731826412-us-west-2/releases/core/cdf-core-##############.tar .
> mkdir cdf-core
> tar -xf cdf-core-##############.tar -C cdf-core

> aws s3 cp s3://cdf-157731826412-us-west-2/releases/clients/cdf-clients-##############.tar .
> mkdir cdf-clients
> tar -xf cdf-clients-##############.tar -C cdf-clients

```

Along with the _cdf-core_ and _cdf-clients_ release packages, a _cdf-infrastructure-*_ and _cdf-facade-*_ project need cloning too the same parent directory as described in the next step.  

## Clone and include _cdf-facade-*_ and _cdf-infrastructure-*_ projects

#### CDF Auto Facade and Infrastructure

The following is an example of how to clone the cdf demo projects:

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



The _cdf-infrastructure-*_ project contains configuration which is used during the deploy. This configuration is separated into folders by service. 
The configuration file used is dependent on the environment parameter passed into the deploy command (see below). 

The presence of a configuration file for a specific environment denotes to the core cdf installation scripts that this service is to be deployed.  The absence implies that it should not be deployed.  Note however that a customer's specific deployment script in their _cdf-infrastructure-*_ package may be performing its own checks too as an intitial validiation of what services need to be deployed.

Some of the configuration values are automatically populated during the deployment. For instance AWS IoT and API Gateway endpoints. However, the S3 
bucket configuration is not auto populated and needs to be configured before the first deployment.

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

## Deploying the project

#### Deployment Prequisites
* EC2 Keypair
* S3 Bucket for CDF Resources
* S3 Bucket for Cloudformation Resources (can be the same as above)
* AWS Profile configured in CLI to target the correct account


To deploy, run the _deploy.bash_ script from the _cdf-infrastructure-*_ project, e.g.:

```sh
> cd cdf-infrastructure-demo
cdf-infrastructure-demo> ./deploy.bash -C -e demo -p 157731826412 -i 0.0.0.0/0 -u cdf-157721836412-us-west-2 -b cdf-157721836412-us-west-2 -R us-west-2 -P 1577
```

For a description of the arguments of the above script, run the script with no arguments as follows:

```sh
cdf-infrastructure-demo> ./deploy.bash
```

## Installing Prequisites

The following is a one-time setup to configure an environment for development and/or deployment:

+ ensure you have a [git client](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) installed
+ ensure you have [jq](https://stedolan.github.io/jq/) installed
+ install [Node Version Manager](https://github.com/creationix/nvm#install--update-script):


```sh
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```

+ using nvm installed from the previous step, install Node.js v12.x:

```sh
> nvm use v12
```

+ install [`pnpm`](https://pnpm.js.org) package manager:

```sh
> npm install -g pnpm
```

## FAQ

???+ question "I'm trying to run the _aws s3_ commands but it reports _Access Denied_"

    Your account must have access to the S3 bucket where the cdf-core releases are stored (currently bucket _cdf-157731826412-us-west-2_ located within account _1577-3182-6412_).  Do you have multiple accounts configured on your computer?  If so, you may need to indicate the specific profile to use by setting the _--profile_ attribute.
