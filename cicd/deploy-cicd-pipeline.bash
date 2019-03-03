#!/bin/bash
set -e

#-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------


function help_message {
    cat << EOF

NAME
    deploy-cicd-pipeline.bash    

DESCRIPTION
    Deploys the CICD pipeline.

MANDATORY ARGUMENTS:
  -b (string)   The name of the S3 bucket to deploy CloudFormation templates into.
	-e (string)	  Name of environment.
  -i (string)   Name of repo of cdf-infrastructure-* project

OPTIONAL ARGUMENTS
	-r (string)   Name of CodeCommit repo (defaults to cdf-core).
	-g (string)   Name of git branch (defaults to master).
	-h (string)   Name of cdf-infrastructure-* git branch (defaults to master).

  -v (string)   Id of VPC where Neptune resides (if running Asset Library in 'full' mode)
  -s (string)   Id of security group with access to Neptune (if running Asset Library in 'full' mode)
  -n (string)   Id of private subnets where Neptune resides (if running Asset Library in 'full' mode)
  -t (string)   Id of private route table ids where Neptune resides (if running Asset Library in 'full' mode)

  -c (string)   Name of common CICD Cloudformation stack name (defaults to cdf-cicd-common-${ENVIRONMENT})
  -a (string)   Name of custom auth cloudformation stack (if running with custom auth enabled)

  -R (string)   AWS region.
  -P (string)   AWS profile.
    
EOF
}


while getopts ":b:e:r:g:h:i:v:s:n:t:c:a:R:P:" opt; do
  case $opt in
	  b  ) export DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
    e  ) export ENVIRONMENT=$OPTARG;;
    r  ) export REPO_NAME=$OPTARG;;
    g  ) export BRANCH=$OPTARG;;
    i  ) export INFRASTRUCTURE_REPO_NAME=$OPTARG;;
    h  ) export INFRASTRUCTURE_BRANCH=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    s  ) export SOURCE_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    t  ) export PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;

    c  ) export COMMON_CICD_STACK_NAME=$OPTARG;;
    a  ) export CUSTOM_AUTH_STACK_NAME=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

if [ -z "$DEPLOY_ARTIFACTS_STORE_BUCKET" ]; then
	echo -b DEPLOY_ARTIFACTS_STORE_BUCKET is required; help_message; exit 1;
fi

if [ -z "$ENVIRONMENT" ]; then
	echo -e ENVIRONMENT is required; help_message; exit 1;
fi

if [ -z "$REPO_NAME" ]; then
  export REPO_NAME=cdf-core
	echo -r REPO_NAME not provided, therefore defaulted to $REPO_NAME
fi

if [ -z "$BRANCH" ]; then
  export BRANCH=master
	echo -g BRANCH not provided, therefore defaulted to $BRANCH
fi

if [ -z "$INFRASTRUCTURE_REPO_NAME" ]; then
	echo -i INFRASTRUCTURE_REPO_NAME is required; help_message; exit 1;
fi

if [ -z "$INFRASTRUCTURE_BRANCH" ]; then
  export INFRASTRUCTURE_BRANCH=master
	echo -h INFRASTRUCTURE_BRANCH not provided, therefore defaulted to $INFRASTRUCTURE_BRANCH
fi

if [ -z "$COMMON_CICD_STACK_NAME" ]; then
  export COMMON_CICD_STACK_NAME=cdf-cicd-common-$ENVIRONMENT
	echo -g COMMON_CICD_STACK_NAME not provided, therefore defaulted to $COMMON_CICD_STACK_NAME
fi

AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


echo '
**********************************************************
  Packaging the CloudFormation template and uploading to S3...
**********************************************************
'
aws cloudformation package \
  --template-file codepipeline.yaml \
  --output-template-file codepipeline-packaged.yaml \
  --s3-bucket $DEPLOY_ARTIFACTS_STORE_BUCKET \
  $AWS_ARGS

echo '
**********************************************************
  Deploying the CloudFormation template
**********************************************************
'
aws cloudformation deploy \
  --stack-name $REPO_NAME-cicd-$ENVIRONMENT \
  --template-file codepipeline-packaged.yaml \
  --parameter-overrides \
      CodePipelineName= \
  		Environment=$ENVIRONMENT \
      RepoName=$REPO_NAME \
      Branch=$BRANCH \
      InfrastructureRepoName=$INFRASTRUCTURE_REPO_NAME \
      InfrastructureBranch=$INFRASTRUCTURE_BRANCH \
      CommonCICDStackName=$COMMON_CICD_STACK_NAME \
      AssetLibraryVpcId=$VPC_ID \
      AssetLibrarySourceSecurityGroupId=$SOURCE_SECURITY_GROUP_ID \
      AssetLibraryPrivateSubnetIds=$PRIVATE_SUBNET_IDS \
      AssetLibraryPrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS \
      CustomAuthStackName=  \
  --capabilities CAPABILITY_NAMED_IAM \
  $AWS_ARGS

echo '
**********************************************************
  Cleaning up
**********************************************************
'
echo Cleaning up
rm -f codepipeline-packaged.yaml


echo '
**********************************************************
  Done!
**********************************************************
'
