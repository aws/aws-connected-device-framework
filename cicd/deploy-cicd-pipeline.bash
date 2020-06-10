#!/bin/bash
set -e

#-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
  -b (string)   The name of the S3 bucket to deploy CloudFormation templates to.
  -d (string)   The name of the S3 bucket to deploy cdf core documentation to.
  -I (string)   Name of repo of cdf-infrastructure-* project
  -e (string)	  Name of environment.

OPTIONAL ARGUMENTS
  -r (string)   Name of CodeCommit repo (defaults to cdf-core).
  -g (string)   Name of git branch (defaults to master).
  -h (string)   Name of cdf-infrastructure-* git branch (defaults to master).

  -N (flag)     Use an existing VPC instead of creating a new one
  -m (string)   Asset library mode - 'full' or 'lite'.  Defaults to 'full'
  -v (string)   Id of VPC where Neptune resides (if running Asset Library in 'full' mode)
  -s (string)   Id of security group with access to Neptune (if running Asset Library in 'full' mode)
  -n (string)   Id of private subnets where Neptune resides (if running Asset Library in 'full' mode)
  -t (string)   Id of private route table ids where Neptune resides (if running Asset Library in 'full' mode)

  -p (string)   The name of the key pair to use to deploy the Bastion EC2 host.
  -o (string)   ID of public subnets (comma delimited) to deploy the Bastion into (required if -N set, and Asset Library 'full' mode)
  -i (string)   The remote access CIDR to configure Bastion SSH access (e.g. 1.2.3.4/32).
  -k (string)   The KMS Key id that the provisoning service will use to decrypt sensitive information.  If not provided, a new KMS key with the alias 'cdf' is created.

  -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
  -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.
  -a (string)   API Gateway authorization type.
  -c (string)   Cognito user pool arn
  -A (string)   Lambda authorizer function arn.

  -R (string)   AWS region.
  -P (string)   AWS profile.
    
EOF
}


while getopts ":b:d:e:r:g:h:I:Nm:v:s:n:o:t:p:i:k:y:z:a:c:A:R:P:" opt; do
  case $opt in
	  b  ) export DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
	  d  ) export DOCUMENTATION_STORE_BUCKET=$OPTARG;;
    e  ) export ENVIRONMENT=$OPTARG;;
    r  ) export REPO_NAME=$OPTARG;;
    g  ) export BRANCH=$OPTARG;;
    I  ) export INFRASTRUCTURE_REPO_NAME=$OPTARG;;
    h  ) export INFRASTRUCTURE_BRANCH=$OPTARG;;

    N  ) export ASSET_LIBRARY_USE_EXISTING_VPC=true;;
    m  ) export ASSET_LIBRARY_MODE=$OPTARG;;
    v  ) export ASSET_LIBRARY_VPC_ID=$OPTARG;;
    s  ) export ASSET_LIBRARY_SOURCE_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export ASSET_LIBRARY_PRIVATE_SUBNET_IDS=$OPTARG;;
    t  ) export ASSET_LIBRARY_PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;

    p  ) export KEY_PAIR_NAME=$OPTARG;;
    o  ) export BASTION_PUBLIC_SUBNET_IDS=$OPTARG;;
    i  ) export BASTION_REMOTE_ACCESS_CIDR=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;

    a  ) export API_GATEWAY_AUTH=$OPTARG;;
    y  ) export TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;
    z  ) export API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    c  ) export COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) export AUTHORIZER_FUNCTION_ARN=$OPTARG;;

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

if [ -z "$DOCUMENTATION_STORE_BUCKET" ]; then
	echo -d DOCUMENTATION_STORE_BUCKET is required; help_message; exit 1;
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

if [ -z "$ASSET_LIBRARY_MODE" ]; then
	ASSET_LIBRARY_MODE=full
fi
if [[ "$ASSET_LIBRARY_MODE" != "lite" && "$ASSET_LIBRARY_MODE" != "full" ]]; then
	echo -m ASSET_LIBRARY_MODE allowed values: 'full', 'lite'; help_message; exit 1;
fi

if [[ "$ASSET_LIBRARY_MODE" = "full" ]]; then
    if [ -z "$KEY_PAIR_NAME" ]; then
        echo -p KEY_PAIR_NAME is required in full mode; help_message; exit 1;
    fi
    if [ -z "$BASTION_REMOTE_ACCESS_CIDR" ]; then
        echo -i BASTION_REMOTE_ACCESS_CIDR is required in full mode; help_message; exit 1;
    fi
fi

if [ -n "$ASSET_LIBRARY_USE_EXISTING_VPC" ]; then
    if [ -z "$ASSET_LIBRARY_VPC_ID" ]; then
        echo -v ASSET_LIBRARY_VPC_ID is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$ASSET_LIBRARY_SOURCE_SECURITY_GROUP_ID" ]; then
        echo -g ASSET_LIBRARY_SOURCE_SECURITY_GROUP_ID is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$ASSET_LIBRARY_PRIVATE_SUBNET_IDS" ]; then
        echo -n ASSET_LIBRARY_PRIVATE_SUBNET_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$BASTION_PUBLIC_SUBNET_IDS" ]; then
        echo -o BASTION_PUBLIC_SUBNET_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$ASSET_LIBRARY_PRIVATE_ROUTE_TABLE_IDS" ]; then
        echo -r ASSET_LIBRARY_PRIVATE_ROUTE_TABLE_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
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
      ArtifactStoreBucketName=$DEPLOY_ARTIFACTS_STORE_BUCKET \
      DocumentationBucketName=$DOCUMENTATION_STORE_BUCKET \
      AssetLibraryMode=$ASSET_LIBRARY_MODE \
      AssetLibraryUseExistingVpc=$ASSET_LIBRARY_USE_EXISTING_VPC \
      AssetLibraryVpcId=$ASSET_LIBRARY_VPC_ID \
      AssetLibrarySourceSecurityGroupId=$ASSET_LIBRARY_SOURCE_SECURITY_GROUP_ID \
      AssetLibraryPrivateSubnetIds=$ASSET_LIBRARY_PRIVATE_SUBNET_IDS \
      AssetLibraryPrivateRouteTableIds=$ASSET_LIBRARY_PRIVATE_ROUTE_TABLE_IDS \
      KeyPairName=$KEY_PAIR_NAME \
      BastionPublicSubnetIds=$BASTION_PUBLIC_SUBNET_IDS \
      BastionRemoteAccessCIDR=$BASTION_REMOTE_ACCESS_CIDR \
      KmsKeyId=$KMS_KEY_ID \
      ApiGatewayAuth=$API_GATEWAY_AUTH  \
      TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE \
      APiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE \
      CognitoUserPoolArn=$COGNTIO_USER_POOL_ARN \
      AuthorizerFunctionArn=$AUTHORIZER_FUNCTION_ARN \
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
