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
    deploy-cfn.bash    

DESCRIPTION
    Deploys the AssetLibrary custom authorizer.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -k (string)   The KMS key ID used to encrypt SSM parameters.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:k:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;
    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


if [ -z "$ENVIRONMENT" ]; then
	echo -e ENVIRONMENT is required; help_message; exit 1;
fi

if [ -z "$KMS_KEY_ID" ]; then
	echo -k KMS_KEY_ID is required; help_message; exit 1;
fi


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi



echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  KMS_KEY_ID:                       $KMS_KEY_ID
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


ASSETLIBRARY_AUTH_STACK_NAME=cdf-assetlibrary-auth-${ENVIRONMENT}

echo '
**********************************************************
  Deploying the AssetLibrary Auth CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-assetlibrary-auth-output.yaml \
  --stack-name $ASSETLIBRARY_AUTH_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      KmsKeyId=$KMS_KEY_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  AssetLibrary Auth Done!
**********************************************************
'