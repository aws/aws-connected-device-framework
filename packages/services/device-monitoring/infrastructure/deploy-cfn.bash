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
    Deploys the device monitoring library.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS:
===================

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

incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CONFIG_LOCATION c "$CONFIG_LOCATION")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

logTitle 'Device Monitoring Identifying deployed endpoints'

rest_apis=$(aws apigateway get-rest-apis $AWS_ARGS)

rest_api_name="CDF Asset Library ($ENVIRONMENT)"
assetlibrary_rest_api_id=$(echo $rest_apis \
    | jq -r --arg rest_api_name "$rest_api_name" \
    '.items[] | select(.name==$rest_api_name) | .id')
assetlibrary_invoke_url="https://$assetlibrary_rest_api_id.execute-api.$AWS_REGION.amazonaws.com/Prod"

logTitle 'Setting Device Monitoring configuration'

cat $CONFIG_LOCATION | \
  jq --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
  '.assetLibrary.baseUrl=$assetlibrary_invoke_url' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION


logTitle 'Deploying the Device Monitoring CloudFormation template'

application_configuration_override=$(cat $CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-device-monitoring-output.yml \
  --stack-name cdf-device-monitoring-${ENVIRONMENT} \
  --parameter-overrides \
      ApplicationConfigurationOverride="$application_configuration_override" \
      Environment=$ENVIRONMENT \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Device Monitoring deployment complete!'
