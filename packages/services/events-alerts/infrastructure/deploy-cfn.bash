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
    Deploys the Events Alerts service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

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


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

STACK_NAME=cdf-eventsProcessor-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


echo '
**********************************************************
  Setting Event Alert configuration
**********************************************************
'
aws_iot_endpoint=$(aws iot describe-endpoint $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

cat $CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint" \
  '.aws.iot.endpoint=$aws_iot_endpoint' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)


echo '
**********************************************************
  Deploying the Event Alerts CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-eventsAlerts-output.yml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  Event Alerts Done!
**********************************************************
'