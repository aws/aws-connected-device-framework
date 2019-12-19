# Deployment

## TL;DR

Ensure you have installed the necessary [pre-reqs](#installing-prequisities) to configure your environment.

The cdf releases are available from S3 for installation.  The core services and clients are released as two separate packages so as to reduce the download size for those only interested in consuming the clients. Retrieve a list of the available releases as follows:

```sh
> aws s3 ls s3://cdf-157731826412-us-west-2/releases/core/

2019-03-16 16:27:33  343978991 cdf-core-##############.tar


> aws s3 ls s3://cdf-157731826412-us-west-2/releases/clients/

2019-03-16 16:27:33  343978991 cdf-clients-##############.tar
```

Download and extract the core and clients releases using the name of the file from the previous step:

```sh
> aws s3 cp s3://cdf-157731826412-us-west-2/releases/core/cdf-core-##############.tar .
> mkdir cdf-core
> tar -xf cdf-core-##############.tar -C cdf-core

> aws s3 cp s3://cdf-157731826412-us-west-2/releases/clients/cdf-clients-##############.tar .
> mkdir cdf-clients
> tar -xf cdf-clients-##############.tar -C cdf-clients

```

Along with the _cdf-core_ and _cdf-clients_ release packages, an _infrastructure_ and _facade_ project need cloning to the same parent directory.  The following is an example of how to clone the cdf demo projects:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-facade-demo
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-infrastructure-demo
```

The _infrastructure_ project contains configuration which is used during the deploy. This configuration is separated into folders by service. The configuration file used is dependent on the environment parameter passed into the deploy command (see below). Some of the configuration values are automatically populated during the deployment. For instance AWS IoT Endpoint and endpoints of CDF services. However, the S3 bucket configuration is not auto populated and needs to be configured before the first deployment.

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

To install, run the _deploy.bash_ script from the _infrastructure_ project:

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