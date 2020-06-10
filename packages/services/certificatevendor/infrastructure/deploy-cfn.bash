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
    Deploys the cdf-certificatevendor service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -b (string)   Name of bucket where certificates are to be stored.
    -r (string)   Registry mode (AssetLibrary or DeviceRegistry)
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS
===================

    -p (string)   Key prefixes of bucket where certificates are to be stored (defaults to none)
    -m (string)   MQTT topic for get certificates (defaults to cdf/certificates/+/get)
    -n (string)   MQTT topic for ack certificates (defaults to cdf/certificates/+/ack)
    -k (string)   The KMS key ID used to encrypt SSM parameters.

    -g (string)   Name of Thing Group containing devices for certificate rotation (defaults to cdfRotateCertificates)
    -G (flag)     Bypass creating the Thing Group containing devices for certificate rotation, instead use an existing one

    -A (string)   Name of asset library stack (defaults to cdf-assetlibrary-${ENVIRONMENT})
    -C (string)   Name of commands stack (defaults to cdf-commands-${ENVIRONMENT})
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}


while getopts ":e:o:c:b:p:k:m:n:r:g:GA:C:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    b  ) export BUCKET=$OPTARG;;
    r  ) export REGISTRY=$OPTARG;;

    p  ) export PREFIX=$OPTARG;;
    m  ) export MQTT_GET_TOPIC=$OPTARG;;
    n  ) export MQTT_ACK_TOPIC=$OPTARG;;
    g  ) export THING_GROUP_NAME=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;
    G  ) export BYPASS_CREATE_THING_GROUP=true;;
    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;
    C  ) export COMMANDS_STACK_NAME=$OPTARG;;

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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument BUCKET f "$BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument REGISTRY r "$REGISTRY")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument OPENSSL_STACK_NAME o "$OPENSSL_STACK_NAME")))

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
  BUCKET:                           $BUCKET
  PREFIX:                           $PREFIX
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


if [ -z "$BYPASS_CREATE_THING_GROUP" ]; then
    logTitle 'Certificate Vendor Creating thing group'
    aws iot create-thing-group \
      --thing-group-name $THING_GROUP_NAME \
      --thing-group-properties thingGroupDescription='CDF - Devices requiring certificate rotation' \
      $AWS_ARGS || true
fi


logTitle 'Certificate Vendor Retrieving thing group'
groupInfo=$(aws iot describe-thing-group --thing-group-name $THING_GROUP_NAME $AWS_ARGS)
thingGroupArn=$(echo $groupInfo | jq -r '.thingGroupArn')

if [ -z "$thingGroupArn" ]; then
	echo Provided Thing Group $THING_GROUP_NAME must exist; exit 1;
fi


logTitle 'Certificate Vendor Identifying deployed endpoints'
aws_iot_endpoint=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

cat $CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint"  \
     --arg rotate_cert_thing_group_name "$THING_GROUP_NAME" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .aws.iot.thingGroup.rotateCertificates=$rotate_cert_thing_group_name' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

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

application_configuration_override=$(cat $CONFIG_LOCATION)


logTitle 'Deploying the Certificate Vendor CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-certificatevendor-output.yml \
  --stack-name $CERTIFICATEVENDOR_STACK_NAME \
  --parameter-overrides \
      BucketName=$BUCKET \
      BucketPrefix=$PREFIX \
      MQTTGetTopic=$MQTT_GET_TOPIC \
      MQTTAckTopic=$MQTT_ACK_TOPIC \
      KmsKeyId=$KMS_KEY_ID \
      ApplicationConfigurationOverride="$application_configuration_override" \
      OpenSslLambdaLayerArn=$openssl_arn \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS



logTitle 'Certificate Vendor Configuring RotateCertificates command'

response=$( lambaInvokeRestApi "$COMMANDS_STACK_NAME" 'GET' '/templates/RotateCertificates' )
status_code=$(echo "$response" | jq -r '.statusCode')

if [ "$status_code" = "404" ]; then

    # template does not exist so lets go ahead and create the template, create
    # a command, then publish the command.

    body='{
        "templateId": "RotateCertificates",
        "description": "Rotate certificates",
        "operation" : "RotateCertificates",
        "document": "{\"get\":{\"subscribe\":\"${cdf:parameter:getSubscribeTopic}\",\"publish\":\"${cdf:parameter:getPublishTopic}\"},\"ack\":{\"subscribe\":\"${cdf:parameter:ackSubscribeTopic}\",\"publish\":\"${cdf:parameter:ackPublishTopic}\"}}",
        "requiredDocumentParameters": [
            "getSubscribeTopic",
            "getPublishTopic",
            "ackSubscribeTopic",
            "ackPublishTopic"
        ]
    }'

    response=$( lambaInvokeRestApi "$COMMANDS_STACK_NAME" 'POST' '/templates' "$body" )
    status_code=$(echo "$response" | jq -r '.statusCode')

  # we use the wildcard + parameter when setting permissions, but for the Job Document we want to provide
  # the token {thingName} to be explicit with devices on where they need to add their name.
  oldText="/+/"
  newText="/{thingName}/"
  getSubscribeTopic=${MQTT_GET_TOPIC/$oldText/$newText}/+
  getPublishTopic=${MQTT_GET_TOPIC/$oldText/$newText}
  ackSubscribeTopic=${MQTT_ACK_TOPIC/$oldText/$newText}/+
  ackPublishTopic=${MQTT_ACK_TOPIC/$oldText/$newText}

  body='{
    "templateId": "RotateCertificates",
    "targets": ["'"$thingGroupArn"'"],
    "type": "CONTINUOUS",
    "rolloutMaximumPerMinute": 120,
    "documentParameters": {
        "getSubscribeTopic":"'"$getSubscribeTopic"'",
        "getPublishTopic":"'"$getPublishTopic"'",
        "ackSubscribeTopic":"'"$ackSubscribeTopic"'",
        "ackPublishTopic":"'"$ackPublishTopic"'"
    }
  }'

  response=$( lambaInvokeRestApi "$COMMANDS_STACK_NAME" 'POST' '/commands' "$body" )
  command_location=$( echo $response | jq -r '.headers.location' )

  body='{
    "commandStatus": "PUBLISHED"
  }'
  response=$( lambaInvokeRestApi "$COMMANDS_STACK_NAME" 'PATCH' "$command_location" "$body" )

fi


logTitle 'Certificate Vendor deployment done!'
