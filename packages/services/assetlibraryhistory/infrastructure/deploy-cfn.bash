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
    Deploys the asset library history service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -t (string)   MQTT topic to subscribe to receive Asset Library configuration change events.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:t:c:b:C:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    t  ) export ASSETLIBRARY_EVENT_TOPICS=$OPTARG;;
    c  ) export ASSETLIBRARYHISTORY_CONFIG_LOCATION=$OPTARG;;

    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;

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

if [ -z "$ASSETLIBRARY_EVENT_TOPICS" ]; then
	echo -t ASSETLIBRARY_EVENT_TOPICS is required; help_message; exit 1;
fi

if [ -z "$ASSETLIBRARYHISTORY_CONFIG_LOCATION" ]; then
	echo -c ASSETLIBRARYHISTORY_CONFIG_LOCATION is required; help_message; exit 1;
fi


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

ASSETLIBRARYHISTORY_STACK_NAME=cdf-assetlibraryhistory-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  ASSETLIBRARY_EVENT_TOPICS:        $ASSETLIBRARY_EVENT_TOPICS
  ASSETLIBRARYHISTORY_CONFIG_LOCATION:  $ASSETLIBRARYHISTORY_CONFIG_LOCATION
  ASSETLIBRARYHISTORY_STACK_NAME:   $ASSETLIBRARYHISTORY_STACK_NAME
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

echo '
**********************************************************
  Deploying the Asset Library History CloudFormation template 
**********************************************************
'
application_configuration_override=$(cat $ASSETLIBRARYHISTORY_CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-assetLibraryHistory-output.yml \
  --stack-name $ASSETLIBRARYHISTORY_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      AssetLibraryEventsTopic=$ASSETLIBRARY_EVENT_TOPICS \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS



echo '
**********************************************************
  Asset Library History Done!
**********************************************************
'