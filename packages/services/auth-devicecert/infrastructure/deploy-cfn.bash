#!/bin/bash
set -e
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi
source ../../../infrastructure/common-deploy-functions.bash

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
====================
    -e (string)   Name of environment.
    -k (string)   The KMS key ID used to encrypt SSM parameters.
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS:
===================
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


incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e ${ENVIRONMENT})))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k ${KMS_KEY_ID})))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument OPENSSL_STACK_NAME o ${OPENSSL_STACK_NAME})))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  KMS_KEY_ID:                       $KMS_KEY_ID
  OPENSSL_STACK_NAME:               $OPENSSL_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

OPENSSL_STACK_NAME=cdf-openssl-${ENVIRONMENT}

logTitle 'Determining OpenSSL lambda layer version'
stack_info=$(aws cloudformation describe-stacks --stack-name $OPENSSL_STACK_NAME $AWS_ARGS)
openssl_arn=$(echo $stack_info \
  | jq -r --arg stack_name "$OPENSSL_STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="LayerVersionArn") | .OutputValue')

logTitle 'Deploying the DeviceCert Auth CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-auth-devicecert-output.yaml \
  --stack-name cdf-auth-devicecert-${ENVIRONMENT} \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      KmsKeyId=$KMS_KEY_ID \
      OpenSslLambdaLayerArn=$openssl_arn \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'DeviceCert Auth deployment done!'
