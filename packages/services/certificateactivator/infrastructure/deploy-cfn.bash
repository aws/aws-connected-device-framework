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
    Deploys the cdf-certificateactivator service.

MANDATORY ARGUMENTS:
====================
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -b (string)   Name of bucket where CRL is stored.
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS
===================
    -A (string)   Name of asset library stack (defaults to cdf-assetlibrary-${ENVIRONMENT})
    -O (string)   Name of provisioning stack (defaults to cdf-provisioning-${ENVIRONMENT})
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}


while getopts ":e:o:c:b:A:O:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    b  ) export CRL_BUCKET=$OPTARG;;

    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;
    O  ) export PROVISIONING_STACK_NAME=$OPTARG;;
    o  ) export OPENSSL_STACK_NAME=$OPTARG;;

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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CRL_BUCKET f "$CRL_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument OPENSSL_STACK_NAME o "$OPENSSL_STACK_NAME")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

ASSETLIBRARY_STACK_NAME="$(defaultIfNotSet 'ASSETLIBRARY_STACK_NAME' A ${ASSETLIBRARY_STACK_NAME} cdf-assetlibrary-${ENVIRONMENT})"
PROVISIONING_STACK_NAME="$(defaultIfNotSet 'PROVISIONING_STACK_NAME' A ${PROVISIONING_STACK_NAME} cdf-provisioning-${ENVIRONMENT})"

CERTIFICATEACTIVATOR_STACK_NAME=cdf-certificateactivator-${ENVIRONMENT}
OPENSSL_STACK_NAME=cdf-openssl-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                          $ENVIRONMENT
  CONFIG_LOCATION:                      $CONFIG_LOCATION
  CRL_BUCKET:                           $CRL_BUCKET
  ASSETLIBRARY_STACK_NAME:              $ASSETLIBRARY_STACK_NAME
  PROVISIONING_STACK_NAME:              $PROVISIONING_STACK_NAME
  OPENSSL_STACK_NAME:                   $OPENSSL_STACK_NAME
  AWS_REGION:                           $AWS_REGION
  AWS_PROFILE:                          $AWS_PROFILE
"
cwd=$(dirname "$0")

logTitle 'Determining OpenSSL lambda layer version'
stack_info=$(aws cloudformation describe-stacks --stack-name $OPENSSL_STACK_NAME $AWS_ARGS)
openssl_arn=$(echo $stack_info \
  | jq -r --arg stack_name "$OPENSSL_STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="LayerVersionArn") | .OutputValue')


logTitle 'Certificate Activator Identifying deployed endpoints ******'
stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

assetlibrary_invoke_export="$ASSETLIBRARY_STACK_NAME-restApiFunctionName"
assetlibrary_invoke=$(echo $stack_exports \
  | jq -r --arg assetlibrary_invoke_export "$assetlibrary_invoke_export" \
  '.Exports[] | select(.Name==$assetlibrary_invoke_export) | .Value')

provisioning_invoke_export="$PROVISIONING_STACK_NAME-restApiFunctionName"
provisioning_invoke=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_export "$provisioning_invoke_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_export) | .Value')

cat $CONFIG_LOCATION | \
  jq --arg assetlibrary_invoke "$assetlibrary_invoke" \
     --arg provisioning_invoke "$provisioning_invoke" \
  ' .assetLibrary.apiFunctionName=$assetlibrary_invoke | .provisioning.apiFunctionName=$provisioning_invoke' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)


logTitle 'Deploying the Certificate Activator CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-certificateactivator-output.yml \
  --stack-name $CERTIFICATEACTIVATOR_STACK_NAME \
  --parameter-overrides \
      BucketName=$CRL_BUCKET \
      ApplicationConfigurationOverride="$application_configuration_override" \
      OpenSslLambdaLayerArn=$openssl_arn \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Certificate Activator deployment complete!'
