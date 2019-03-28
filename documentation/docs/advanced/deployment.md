# Deployment

## TL;DR

The cdf releases are available from S3 for installation.  The core services and clients are released as two separate packages so as to reduce the download size for those only interested in consuming the clients. Retrieve a list of the available releases as follows:

```sh
> aws s3 ls s3://cdf-157731826412-us-west-2/releases/core/

2019-03-16 16:27:33  343978991 cdf-core-20190316222725.zip

> aws s3 ls s3://cdf-157731826412-us-west-2/releases/clients/

2019-03-16 16:27:33  343978991 cdf-clients-20190316222725.zip
```

Download and extract the core and clients releases using the name of the file from the previous step:

```sh
> aws s3 cp s3://cdf-157731826412-us-west-2/releases/core/cdf-core-20190316222725.zip .
> unzip cdf-core-20190316222725.zip -d cdf-core
> aws s3 cp s3://cdf-157731826412-us-west-2/releases/clients/cdf-clients-20190316222725.zip .
> unzip cdf-clients-20190316222725.zip -d cdf-clients
```

Along with the _cdf-core_ and _cdf-clients_ release packages, an _infrastructure_ and _facade_ project need cloning to the same parent directory.  The following is an example of how to clone the cdf demo projects:

```sh
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-facade-demo
> git clone https://git-codecommit.us-west-2.amazonaws.com/v1/repos/cdf-infrastructure-demo
```

To install, run the _deploy.bash_ script from the _infrastructure_ project:

```sh
> cd cdf-infrastructure-demo
cdf-infrastructure-demo> ./deploy.bash -e demo -p 157731826412 -i 0.0.0.0/0 -u cdf-157721836412-us-west-2 -b cdf-157721836412-us-west-2 -R us-west-2 -P 1577
```

For a description of the arguments of the above script, run the script with no arguments as follows:

```sh
cdf-infrastructure-demo> ./deploy.bash
```

## FAQ

???+ question "I'm trying to run the _aws s3_ commands but it reports _Access Denied_"

    Your account must have access to the S3 bucket where the cdf-core releases are stored (currently bucket _cdf-157731826412-us-west-2_ located within account _1577-3182-6412_).  Do you have multiple accounts configured on your computer?  If so, you may need to indicate the specific profile to use by setting the _--profile_ attribute.