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
    Deploys the cdf-certificatevendor service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -b (string)   Name of bucket where certificates are to be stored.
    -r (string)   Registry mode (AssetLibrary or DeviceRegistry)

OPTIONAL ARGUMENTS
    -p (string)   Key prefixes of bucket where certificates are to be stored (defaults to none)
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


while getopts ":e:c:b:p:m:n:r:g:GA:C:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CERTIFICATEVENDOR_CONFIG_LOCATION=$OPTARG;;
    b  ) export BUCKET=$OPTARG;;
    r  ) export REGISTRY=$OPTARG;;

    p  ) export PREFIX=$OPTARG;;
    m  ) export MQTT_GET_TOPIC=$OPTARG;;
    m  ) export MQTT_ACK_TOPIC=$OPTARG;;
    g  ) export THING_GROUP_NAME=$OPTARG;;
    G  ) export BYPASS_CREATE_THING_GROUP=true;;
    A  ) export ASSETLIBRARY_STACK_NAME=$OPTARG;;
    C  ) export COMMANDS_STACK_NAME=$OPTARG;;

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

if [ -z "$CERTIFICATEVENDOR_CONFIG_LOCATION" ]; then
	echo -c CERTIFICATEVENDOR_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$BUCKET" ]; then
	echo -f BUCKET is required; help_message; exit 1;
fi

if [ -z "$REGISTRY" ]; then
	echo -r REGISTRY is required; help_message; exit 1;
fi

if [ -z "$MQTT_GET_TOPIC" ]; then
  MQTT_GET_TOPIC=cdf/certificates/+/get
  echo -f MQTT_GET_TOPIC not provided, therefore defaulted to $MQTT_GET_TOPIC
fi

if [ -z "$MQTT_ACK_TOPIC" ]; then
  MQTT_ACK_TOPIC=cdf/certificates/+/ack
  echo -f MQTT_ACK_TOPIC not provided, therefore defaulted to $MQTT_ACK_TOPIC
fi

if [ -z "$THING_GROUP_NAME" ]; then
  echo -g THING_GROUP_NAME not provided, therefore defaulting to cdfRotateCertificates
  THING_GROUP_NAME=cdfRotateCertificates
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
if [ -z "$COMMANDS_STACK_NAME" ]; then
  COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}
fi

CERTIFICATEVENDOR_STACK_NAME=cdf-certificatevendor-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CERTIFICATEVENDOR_CONFIG_LOCATION:  $CERTIFICATEVENDOR_CONFIG_LOCATION
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
  COMMANDS_STACK_NAME:              $COMMANDS_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"



if [ -z "$BYPASS_CREATE_THING_GROUP" ]; then
    echo '
**********************************************************
*****  Certificate Vendor Creating thing group      ******
**********************************************************
'
    aws iot create-thing-group \
      --thing-group-name $THING_GROUP_NAME \
      --thing-group-properties thingGroupDescription='CDF - Devices requiring certificate rotation' \
      $AWS_ARGS || true
fi


echo '
**********************************************************
*****  Certificate Vendor Retrieving thing group    ******
**********************************************************
'
groupInfo=$(aws iot describe-thing-group --thing-group-name $THING_GROUP_NAME $AWS_ARGS)
thingGroupArn=$(echo $groupInfo | jq -r '.thingGroupArn')

if [ -z "$thingGroupArn" ]; then
	echo Provided Thing Group $THING_GROUP_NAME must exist; exit 1;
fi


echo '
**********************************************************
*****  Certificate Vendor Identifying deployed endpoints ******
**********************************************************
'
aws_iot_endpoint=$(aws iot describe-endpoint $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

commands_invoke_url_export="$COMMANDS_STACK_NAME-apigatewayurl"
commands_invoke_url=$(echo $stack_exports \
    | jq -r --arg commands_invoke_url_export "$commands_invoke_url_export" \
    '.Exports[] | select(.Name==$commands_invoke_url_export) | .Value')

cat $CERTIFICATEVENDOR_CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint"  \
     --arg rotate_cert_thing_group_name "$THING_GROUP_NAME" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .aws.iot.thingGroup.rotateCertificates=$rotate_cert_thing_group_name' \
  > $CERTIFICATEVENDOR_CONFIG_LOCATION.tmp && mv $CERTIFICATEVENDOR_CONFIG_LOCATION.tmp $CERTIFICATEVENDOR_CONFIG_LOCATION

if [ "$REGISTRY" = "AssetLibrary" ]; then
  assetlibrary_invoke_url_export="$ASSETLIBRARY_STACK_NAME-apigatewayurl"
  assetlibrary_invoke_url=$(echo $stack_exports \
      | jq -r --arg assetlibrary_invoke_url_export "$assetlibrary_invoke_url_export" \
      '.Exports[] | select(.Name==$assetlibrary_invoke_url_export) | .Value')

  cat $CERTIFICATEVENDOR_CONFIG_LOCATION | \
    jq --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
    ' .assetLibrary.baseUrl=$assetlibrary_invoke_url' \
    > $CERTIFICATEVENDOR_CONFIG_LOCATION.tmp && mv $CERTIFICATEVENDOR_CONFIG_LOCATION.tmp $CERTIFICATEVENDOR_CONFIG_LOCATION
fi

application_configuration_override=$(cat $CERTIFICATEVENDOR_CONFIG_LOCATION)


echo '
**********************************************************
  Deploying the Certificate Vendor CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file build/cfn-certificatevendor-output.yml \
  --stack-name $CERTIFICATEVENDOR_STACK_NAME \
  --parameter-overrides \
      BucketName=$BUCKET \
      BucketPrefix=$PREFIX \
      MQTTGetTopic=$MQTT_GET_TOPIC \
      MQTTAckTopic=$MQTT_ACK_TOPIC \
      ApplicationConfigurationOverride="$application_configuration_override" \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS



echo '
**********************************************************
*****  Certificate Vendor Configuring RotateCertificates command ******
**********************************************************
'
http_code=$(curl -X GET --write-out "%{http_code}\n" --silent --output /dev/null "$commands_invoke_url/templates/RotateCertificates" \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json')

if [ "$http_code" = "404" ]; then

  curl -X POST "$commands_invoke_url/templates" \
    -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
    -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
    -d '{
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

  # we use the wildcard + parameter when setting permissions, but for the Job Document we want to provide
  # the token {thingName} to be explicit with devices on where they need to add their name.
  oldText="/+/"
  newText="/{thingName}/"
  getSubscribeTopic=${MQTT_GET_TOPIC/$oldText/$newText}/+
  getPublishTopic=${MQTT_GET_TOPIC/$oldText/$newText}
  ackSubscribeTopic=${MQTT_ACK_TOPIC/$oldText/$newText}/+
  ackPublishTopic=${MQTT_ACK_TOPIC/$oldText/$newText}

  command_location=$(curl -X POST -si "$commands_invoke_url/commands" \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
   -d '{
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
  }
  ' | tr -d '\r' | sed -En 's/^location: (.*)/\1/p')

  curl -X PATCH "$commands_invoke_url$command_location" \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -d '{
    "commandStatus": "PUBLISHED"
  }'

fi


echo '
**********************************************************
  Certificate Vendor Done!
**********************************************************
'