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
    Deploys the cdf-certificateactivator service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -b (string)   Name of bucket where CRL is stored.

OPTIONAL ARGUMENTS
    -A (string)   Name of asset library stack (defaults to cdf-assetlibrary-${ENVIRONMENT})
    -O (string)   Name of provisioning stack (defaults to cdf-provisioning-${ENVIRONMENT})
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}


while getopts ":e:c:b:A:O:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CERTIFICATEACTIVATOR_CONFIG_LOCATION=$OPTARG;;
    b  ) export CRL_BUCKET=$OPTARG;;

    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;
    O  ) export PROVISIONING_STACK_NAME=$OPTARG;;

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

if [ -z "$CERTIFICATEACTIVATOR_CONFIG_LOCATION" ]; then
	echo -c CERTIFICATEACTIVATOR_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$CRL_BUCKET" ]; then
	echo -f CRL_BUCKET is required; help_message; exit 1;
fi

AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


if [ -z "$ASSETLIBRARY_STACK_NAME" ]; then
  ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
fi
if [ -z "$PROVISIONING_STACK_NAME" ]; then
  PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
fi

CERTIFICATEACTIVATOR_STACK_NAME=cdf-certificateactivator-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                          $ENVIRONMENT
  CERTIFICATEACTIVATOR_CONFIG_LOCATION: $CERTIFICATEACTIVATOR_CONFIG_LOCATION
  CRL_BUCKET:                           $CRL_BUCKET
  ASSETLIBRARY_STACK_NAME:              $ASSETLIBRARY_STACK_NAME
  PROVISIONING_STACK_NAME:              $PROVISIONING_STACK_NAME
  AWS_REGION:                           $AWS_REGION
  AWS_PROFILE:                          $AWS_PROFILE
"
cwd=$(dirname "$0")


echo '
******************************************************************
*****  Certificate Activator Identifying deployed endpoints ******
******************************************************************
'
stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

assetlibrary_invoke_url_export="$ASSETLIBRARY_STACK_NAME-apigatewayurl"
assetlibrary_invoke_url=$(echo $stack_exports \
  | jq -r --arg assetlibrary_invoke_url_export "$assetlibrary_invoke_url_export" \
  '.Exports[] | select(.Name==$assetlibrary_invoke_url_export) | .Value')

provisioning_invoke_url_export="$PROVISIONING_STACK_NAME-apigatewayurl"
provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_url_export "$provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_url_export) | .Value')

cat $CERTIFICATEACTIVATOR_CONFIG_LOCATION | \
  jq --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
     --arg provisioning_invoke_url "$provisioning_invoke_url" \
  ' .assetLibrary.baseUrl=$assetlibrary_invoke_url | .provisioning.baseUrl=$provisioning_invoke_url' \
  > $CERTIFICATEACTIVATOR_CONFIG_LOCATION.tmp && mv $CERTIFICATEACTIVATOR_CONFIG_LOCATION.tmp $CERTIFICATEACTIVATOR_CONFIG_LOCATION

application_configuration_override=$(cat $CERTIFICATEACTIVATOR_CONFIG_LOCATION)


echo '
***************************************************************
  Deploying the Certificate Activator CloudFormation template 
***************************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-certificateactivator-output.yml \
  --stack-name $CERTIFICATEACTIVATOR_STACK_NAME \
  --parameter-overrides \
      BucketName=$CRL_BUCKET \
      ApplicationConfigurationOverride="$application_configuration_override" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  Certificate Activator Done!
**********************************************************
'