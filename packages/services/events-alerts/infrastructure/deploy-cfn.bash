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
    Deploys the Events Alerts service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS
===================

    -p (string)   Name of events-processor CloudFormation stack name (will default to cdf-eventsProcessor-${enviornment} if not provided).

    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:p:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

    p  ) export EVENTS_PROCESSOR_STACK_NAME=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CONFIG_LOCATION c "$CONFIG_LOCATION")))

EVENTS_PROCESSOR_STACK_NAME="$(defaultIfNotSet 'EVENTS_PROCESSOR_STACK_NAME' p ${EVENTS_PROCESSOR_STACK_NAME} cdf-eventsProcessor-${ENVIRONMENT})"

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

STACK_NAME=cdf-eventsAlerts-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  EVENTS_PROCESSOR_STACK_NAME:      $EVENTS_PROCESSOR_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

application_configuration_override=$(cat $CONFIG_LOCATION)

logTitle 'Deploying the Event Alerts CloudFormation template '
aws cloudformation deploy \
  --template-file "$cwd/build/cfn-eventsAlerts-output.yml" \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
      Environment=${ENVIRONMENT} \
      ApplicationConfigurationOverride="$application_configuration_override" \
      EventsProcessorStackName=${EVENTS_PROCESSOR_STACK_NAME} \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWG_ARGS


logTitle 'Event Alerts deployment complete'
