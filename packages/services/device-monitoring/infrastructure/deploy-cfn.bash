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
    Deploys the device monitoring library.

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
    c  ) export DEVICEMONITORING_CONFIG_LOCATION=$OPTARG;;

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

if [ -z "$DEVICEMONITORING_CONFIG_LOCATION" ]; then
	echo -c DEVICEMONITORING_CONFIG_LOCATION is required; help_message; exit 1;
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
  DEVICEMONITORING_CONFIG_LOCATION: $DEVICEMONITORING_CONFIG_LOCATION
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

echo '
**********************************************************
*****  Device Monitoring Identifying deployed endpoints ******
**********************************************************
'

rest_apis=$(aws apigateway get-rest-apis $AWS_ARGS)

rest_api_name="cdf-assetlibrary-$ENVIRONMENT"
assetlibrary_rest_api_id=$(echo $rest_apis \
    | jq -r --arg rest_api_name "$rest_api_name" \
    '.items[] | select(.name==$rest_api_name) | .id')
assetlibrary_invoke_url="https://$assetlibrary_rest_api_id.execute-api.$AWS_REGION.amazonaws.com/Prod"

echo '
**********************************************************
*****  Setting Device Monitoring configuration      ******
**********************************************************
'

cat $DEVICEMONITORING_CONFIG_LOCATION | \
  jq --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
  '.assetLibrary.baseUrl=$assetlibrary_invoke_url' \
  > $DEVICEMONITORING_CONFIG_LOCATION.tmp && mv $DEVICEMONITORING_CONFIG_LOCATION.tmp $DEVICEMONITORING_CONFIG_LOCATION



echo '
**********************************************************
  Deploying the Device Monitoring CloudFormation template 
**********************************************************
'
application_configuration_override=$(cat $DEVICEMONITORING_CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-device-monitoring-output.yml \
  --stack-name cdf-device-monitoring-${ENVIRONMENT} \
  --parameter-overrides \
      ApplicationConfigurationOverride="$application_configuration_override" \
      Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  Device Monitoring Done!
**********************************************************
'