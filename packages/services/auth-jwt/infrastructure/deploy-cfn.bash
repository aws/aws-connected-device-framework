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
    Deploys the auth-jwt custom authorizer.

MANDATORY ARGUMENTS:
====================
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS:
===================
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:o:c:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    o  ) export OPENSSL_STACK_NAME=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


incorrect_args=0
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e ${ENVIRONMENT})))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CONFIG_LOCATION c "$CONFIG_LOCATION")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument OPENSSL_STACK_NAME o ${OPENSSL_STACK_NAME})))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )



echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  OPENSSL_STACK_NAME:               $OPENSSL_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


AUTH_JWT_STACK_NAME=cdf-auth-jwt-${ENVIRONMENT}
OPENSSL_STACK_NAME=cdf-openssl-${ENVIRONMENT}

logTitle 'Determining OpenSSL lambda layer version'
stack_info=$(aws cloudformation describe-stacks --stack-name $OPENSSL_STACK_NAME $AWS_ARGS)
openssl_arn=$(echo $stack_info \
  | jq -r --arg stack_name "$OPENSSL_STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="LayerVersionArn") | .OutputValue')



application_configuration_override=$(cat $CONFIG_LOCATION)

logTitle 'Deploying the auth-jwt CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-auth-jwt-output.yaml \
  --stack-name $AUTH_JWT_STACK_NAME \
  --parameter-overrides \
      ApplicationConfigurationOverride="$application_configuration_override" \
      OpenSslLambdaLayerArn=$openssl_arn \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'auth-jwt deployment done!
