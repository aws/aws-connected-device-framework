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
    Deploys the device cert based custom authorizer.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -k (string)   The KMS key ID used to encrypt SSM parameters.
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:o:k:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    o  ) export OPENSSL_STACK_NAME=$OPTARG;;
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

if [ -z "$OPENSSL_STACK_NAME" ]; then
  echo -o OPENSSL_STACK_NAME is required; help_message; exit 1;
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
  OPENSSL_STACK_NAME:               $OPENSSL_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

echo '
**********************************************************
  Deploying the DeviceCert Auth CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-auth-devicecert-output.yaml \
  --stack-name cdf-auth-devicecert-${ENVIRONMENT} \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      KmsKeyId=$KMS_KEY_ID \
      OpenSslLambdaLayerStackName=$OPENSSL_STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  DeviceCert Auth Done!
**********************************************************
'