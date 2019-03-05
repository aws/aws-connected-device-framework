# CICD

## Introduction

CDF includes CodePipeline based continous deliver pipelines. 

## Deployment

First, deploy the CI/CD resources common across all the pipelines.  These includes an S3 bucket, along with policy, for the storage of CloudFormation artifacts, the CodeBuild role, CodePipeline role, Lambda invoker role, and failure SSN topic and policy:

```sh
# NOTE: refer to the {cdf-cicd}/infrastructure/deploy-cicd-pipeline.bash script for 
# help on the available arguments

cdf-cicd/infrastructure> ./deploy-common-cicd-cfn.bash -b cdf-157731826412-us-west-2 -e development
```

Now, deploy the CI/CD pipeline specific to each project.  Example of deploying the pipeline for `cdf-assetlibrary-client`:

```sh
# NOTE: refer to the {cdf-assetlibrary-client}/infrastructure/cicd/deploy-cicd-pipeline.bash
# script for help on the available arguments

cdf-assetlibrary-client/infrastructure/cicd> ./deploy-cicd-pipeline.bash -b cdf-157731826412-us-west-2 -e development
```

An example of deploying the pipeline for `cdf-assetlibrary` into an existing VPC:

```sh
# NOTE: refer to the {cdf-assetlibrary}/infrastructure/cicd/deploy-cicd-pipeline.bash
# script for help on the available arguments

cdf-assetlibrary/infrastructure/cicd> ./deploy-cicd-pipeline.bash -b cdf-157731826412-us-west-2 -e development -i cdf-infrastructure-cummins -v vpc-034b3ce7ffacce9d0 -s sg-031fcef7b2821037e -n subnet-0df8ef64dfa6dc825,subnet-0be681a72c7db1c2d -t rtb-0fc5765aa27fc5fda,rtb-047e1214af8916769
```