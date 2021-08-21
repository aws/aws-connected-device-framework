#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------
set -e
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi
source ../../../infrastructure/common-deploy-functions.bash


function help_message {
    cat << EOF

NAME
    deploy-cfn.bash

DESCRIPTION
    Deploys the cdf-certificatevendor service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -r (string)   Registry mode (AssetLibrary or DeviceRegistry)
    -o (string)   The OpenSSL lambda layer stack name.
    -l (string)   Custom Resource Lambda Arn
    -k (string)   The KMS key ID used to encrypt SSM parameters.

OPTIONAL ARGUMENTS
===================

    -m (string)   MQTT topic for get certificates (defaults to cdf/certificates/+/get)
    -n (string)   MQTT topic for ack certificates (defaults to cdf/certificates/+/ack)

    -g (string)   Name of Thing Group containing devices for certificate rotation (defaults to cdfRotateCertificates)
    -G (flag)     Bypass creating the Thing Group containing devices for certificate rotation, instead use an existing one

    -A (string)   Name of asset library stack (defaults to cdf-assetlibrary-${ENVIRONMENT})
    -C (string)   Name of commands stack (defaults to cdf-commands-${ENVIRONMENT})
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}


while getopts ":e:o:c:k:m:n:r:g:GA:C:l:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    r  ) export REGISTRY=$OPTARG;;

    m  ) export MQTT_GET_TOPIC=$OPTARG;;
    n  ) export MQTT_ACK_TOPIC=$OPTARG;;
    g  ) export THING_GROUP_NAME=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;
    G  ) export BYPASS_CREATE_THING_GROUP=true;;
    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;
    C  ) export COMMANDS_STACK_NAME=$OPTARG;;
    l  ) export CUSTOM_RESOURCE_LAMBDA_ARN=$OPTARG;;


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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument REGISTRY r "$REGISTRY")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument OPENSSL_STACK_NAME o "$OPENSSL_STACK_NAME")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CUSTOM_RESROUCE_LAMBDA_ARN l "$CUSTOM_RESOURCE_LAMBDA_ARN")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k "$KMS_KEY_ID")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

MQTT_GET_TOPIC="$(defaultIfNotSet 'MQTT_GET_TOPIC' m ${MQTT_GET_TOPIC} 'cdf/certificates/+/get')"
MQTT_ACK_TOPIC="$(defaultIfNotSet 'MQTT_ACK_TOPIC' n ${MQTT_ACK_TOPIC} 'cdf/certificates/+/ack')"
THING_GROUP_NAME="$(defaultIfNotSet 'THING_GROUP_NAME' g ${THING_GROUP_NAME} 'cdfRotateCertificates')"
ASSETLIBRARY_STACK_NAME="$(defaultIfNotSet 'ASSETLIBRARY_STACK_NAME' A ${ASSETLIBRARY_STACK_NAME} cdf-assetlibrary-${ENVIRONMENT})"
COMMANDS_STACK_NAME="$(defaultIfNotSet 'COMMANDS_STACK_NAME' C ${COMMANDS_STACK_NAME} cdf-commands-${ENVIRONMENT})"
CERTIFICATEVENDOR_STACK_NAME=cdf-certificatevendor-${ENVIRONMENT}
OPENSSL_STACK_NAME=cdf-openssl-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  REGISTRY:                         $REGISTRY
  MQTT_GET_TOPIC:                   $MQTT_GET_TOPIC
  MQTT_ACK_TOPIC:                   $MQTT_ACK_TOPIC
  THING_GROUP_NAME:                 $THING_GROUP_NAME
  BYPASS_CREATE_THING_GROUP:        $BYPASS_CREATE_THING_GROUP"

  if [ -z "$BYPASS_CREATE_THING_GROUP" ]; then
      echo -n 'not provided, therefore Thing Group will be created'
  fi

echo "
  ASSETLIBRARY_STACK_NAME:          $ASSETLIBRARY_STACK_NAME
  KMS_KEY_ID:                       $KMS_KEY_ID
  COMMANDS_STACK_NAME:              $COMMANDS_STACK_NAME
  OPENSSL_STACK_NAME:               $OPENSSL_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

logTitle 'Determining OpenSSL lambda layer version'
stack_info=$(aws cloudformation describe-stacks --stack-name $OPENSSL_STACK_NAME $AWS_ARGS)

openssl_arn=$(echo $stack_info \
  | jq -r --arg stack_name "$OPENSSL_STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="LayerVersionArn") | .OutputValue')


logTitle 'Certificate Vendor Identifying deployed endpoints'

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

if [ "$REGISTRY" = "AssetLibrary" ]; then
  assetlibrary_invoke_export="$ASSETLIBRARY_STACK_NAME-restApiFunctionName"
  assetlibrary_invoke=$(echo $stack_exports \
      | jq -r --arg assetlibrary_invoke_export "$assetlibrary_invoke_export" \
      '.Exports[] | select(.Name==$assetlibrary_invoke_export) | .Value')

  cat $CONFIG_LOCATION | \
    jq --arg assetlibrary_invoke "$assetlibrary_invoke" \
    ' .assetLibrary.apiFunctionName=$assetlibrary_invoke' \
    > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION
fi

commands_invoke_export="$COMMANDS_STACK_NAME-restApiFunctionName"
commands_invoke=$(echo $stack_exports \
    | jq -r --arg commands_invoke_export "$commands_invoke_export" \
    '.Exports[] | select(.Name==$commands_invoke_export) | .Value')

application_configuration_override=$(cat $CONFIG_LOCATION)

certificatevendor_bucket=$(echo $application_configuration_override | jq -r '.aws.s3.certificates.bucket')
certificatevendor_prefix=$(echo $application_configuration_override | jq -r '.aws.s3.certificates.prefix')


logTitle 'Deploying the Certificate Vendor CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-certificatevendor-output.yml \
  --stack-name $CERTIFICATEVENDOR_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      BucketName=$certificatevendor_bucket \
      BucketPrefix=$certificatevendor_prefix \
      MQTTGetTopic=$MQTT_GET_TOPIC \
      MQTTAckTopic=$MQTT_ACK_TOPIC \
      ThingGroupName=$THING_GROUP_NAME \
      KmsKeyId=$KMS_KEY_ID \
      ApplicationConfigurationOverride="$application_configuration_override" \
      OpenSslLambdaLayerArn=$openssl_arn \
      CustomResourceLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
      AssetLibraryFunctionName=$assetlibrary_invoke \
      CommandsFunctionName=$commands_invoke \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

logTitle 'Certificate Vendor deployment done!'
