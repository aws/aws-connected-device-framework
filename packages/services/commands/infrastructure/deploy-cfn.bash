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
    deploy-cfn.bash    

DESCRIPTION
    Deploys the commands service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -f (string)   Name of bucket where command files are to be stored.

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -Q (string)   Name of provisioning stack.  Defaults to cdf-provisioning-${ENVIRONMENT}.
    -A (string)   Name of asset library stack.  Defaults to cdf-assetlibrary-${ENVIRONMENT}.
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:f:C:Q:A:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export COMMANDS_CONFIG_LOCATION=$OPTARG;;
    f  ) export BUCKET=$OPTARG;;

    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;
    Q  ) export PROVISIONING_STACK_NAME=$OPTARG;;
    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;

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

if [ -z "$COMMANDS_CONFIG_LOCATION" ]; then
	echo -c COMMANDS_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$BUCKET" ]; then
	echo -f BUCKET is required; help_message; exit 1;
fi


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


if [ -z "$CUST_AUTH_STACK_NAME" ]; then
  CUST_AUTH_STACK_NAME=cdf-custom-auth-${ENVIRONMENT}
fi
if [ -z "$ASSETLIBRARY_STACK_NAME" ]; then
  ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
fi
if [ -z "$PROVISIONING_STACK_NAME" ]; then
  PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
fi

COMMANDS_PRE_STACK_NAME=cdf-commands-pre-${ENVIRONMENT}
COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  ASSETLIBRARY_STACK_NAME:          $ASSETLIBRARY_STACK_NAME
  PROVISIONING_STACK_NAME:          $PROVISIONING_STACK_NAME
  COMMANDS_CONFIG_LOCATION:         $COMMANDS_CONFIG_LOCATION
  BUCKET:                           $BUCKET
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


echo '
**********************************************************
  Enabling IoT job lifecycle events
**********************************************************
'
aws iot update-event-configurations --cli-input-json \
'{
    "eventConfigurations": {
        "JOB": {
            "Enabled": true
        }
    }
}' $AWS_ARGS


echo '
**********************************************************
  Setting Commands configuration
**********************************************************
'
aws_iot_endpoint=$(aws iot describe-endpoint $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

provisioning_invoke_url_export="$PROVISIONING_STACK_NAME-apigatewayurl"
provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_url_export "$provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_url_export) | .Value')

assetlibrary_invoke_url_export="$ASSETLIBRARY_STACK_NAME-apigatewayurl"
assetlibrary_invoke_url=$(echo $stack_exports \
    | jq -r --arg assetlibrary_invoke_url_export "$assetlibrary_invoke_url_export" \
    '.Exports[] | select(.Name==$assetlibrary_invoke_url_export) | .Value')

cat $COMMANDS_CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint" --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" --arg provisioning_invoke_url "$provisioning_invoke_url" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .assetLibrary.baseUrl=$assetlibrary_invoke_url | .provisioning.baseUrl=$provisioning_invoke_url' \
  > $COMMANDS_CONFIG_LOCATION.tmp && mv $COMMANDS_CONFIG_LOCATION.tmp $COMMANDS_CONFIG_LOCATION

application_configuration_override=$(cat $COMMANDS_CONFIG_LOCATION)


echo '
**********************************************************
  Deploying the Commands CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-commands-output.yml \
  --stack-name $COMMANDS_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      BucketName=$BUCKET \
      ApplicationConfigurationOverride="$application_configuration_override" \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  Commands Done!
**********************************************************
'