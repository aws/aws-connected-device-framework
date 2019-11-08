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
    Deploys the auth-jwt custom authorizer.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -i (string)   The JWT issuer, e.g. https://cognito-idp.us-east-1.amazonaws.com/${cognitoPoolId}.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:i:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    i  ) export JWT_ISSUER=$OPTARG;;

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

if [ -z "$CONFIG_LOCATION" ]; then
	echo -c CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$JWT_ISSUER" ]; then
	echo -i JWT_ISSUER is required; help_message; exit 1;
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
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  JWT_ISSUER:                       $JWT_ISSUER
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


AUTH_JWT_STACK_NAME=cdf-auth-jwt-${ENVIRONMENT}


echo '
**********************************************************
  Setting auth-jwt configuration
**********************************************************
'
cat $CONFIG_LOCATION | \
  jq --arg issuer "$JWT_ISSUER" \
  '.token.issuer=$issuer' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)

echo '
**********************************************************
  Deploying the auth-jwt CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-auth-jwt-output.yaml \
  --stack-name $AUTH_JWT_STACK_NAME \
  --parameter-overrides \
      ApplicationConfigurationOverride="$application_configuration_override" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  auth-jwt Done!
**********************************************************
'