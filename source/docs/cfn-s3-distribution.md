# Compiling Source-code for direct S3 cloudformation deployment

## Introduction
The following instructions are only applicable for single stack cfn deploy form S3 bucket. Follow the cdf documentation
for deployment. The scripts included within the root deployment directory bundles the source and compiles the cloudformation templates
which then can be hosted from a S3 bucket.

The `deployment/build-open-source-dish.sh` bundles the cdf source code and complies the cloudformation templates by applying `yq` transforms.
The transforms are necessary to modify all the `CodeUri` and `ContentUri` references defined in the cloudformation resources by changing the local path 
references to be a S3 path. 

In-case of new addition or modification to cloudformation templates, the transforms should also be modified to accommodate for any new changes
to the cfn templates, so that this deployment mechanism is compatible with CDF.

Below are the steps to execute the scripts to compile cdf for cloudformation s3 distribution.

## Building distributable for cloudformation S3 deploy
* Configure the bucket name of your target Amazon S3 distribution bucket
```
export DIST_OUTPUT_BUCKET=my-bucket-name # bucket where customized code will reside
export SOLUTION_NAME=my-solution-name
export VERSION=my-version # version number for the customized code
export DIST_TEMPLATES_BUCKET=my-templates-bucket-name # bucket where templates will reside
```
_Note:_ You would have to create an S3 bucket with the prefix 'my-bucket-name-<aws_region>'; aws_region is where you are testing the customized solution. Also, the assets in bucket should be publicly accessible.

* Now build the distributable:
```
chmod +x ./build-s3-dist.sh \n
./build-s3-dist.sh $DIST_OUTPUT_BUCKET $SOLUTION_NAME $VERSION $DIST_TEMPLATES_BUCKET \n
```

* Sample Command:
```
./build-s3-dist.sh cdf-{account} cdf-core latest cdf-{account}-templates
```

* Deploy the distributable to an Amazon S3 bucket in your account. _Note:_ you must have the AWS Command Line Interface installed.
```
Copy templates
aws s3 cp ./global-s3-assets s3://my-bucket-name/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control \n

Copy Code packages
aws s3 cp ./regional-s3-assets s3://my-bucket-name-<region>/$SOLUTION_NAME/$VERSION/ --recursive --acl bucket-owner-full-control \n
```

Sample Commands:
```
 aws s3 cp ./global-s3-assets s3://cdf-{account}-templates/cdf-core/latest --recursive --acl bucket-owner-full-control

 aws s3 cp ./regional-s3-assets s3://cdf-{account}-us-east-2/cdf-core/latest --recursive --acl bucket-owner-full-control
```

* Get the link of the solution template uploaded to your Amazon S3 bucket.
* Deploy the solution to your account by launching a new AWS CloudFormation stack using the link of the solution template in Amazon S3.
