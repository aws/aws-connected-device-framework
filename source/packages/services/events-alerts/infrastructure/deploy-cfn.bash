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
    Deploys the Events Alerts service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -k (string)   The KMS key ID used to decrypt the DynamoDB stream.


OPTIONAL ARGUMENTS
===================

    -p (string)   Name of events-processor CloudFormation stack name (will default to cdf-eventsProcessor-${enviornment} if not provided).

    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}

while getopts ":e:c:p:R:k:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

    p  ) export EVENTS_PROCESSOR_STACK_NAME=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;
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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k "$KMS_KEY_ID")))

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
  KMS_KEY_ID:                       $KMS_KEY_ID
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  EVENTS_PROCESSOR_STACK_NAME:      $EVENTS_PROCESSOR_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

logTitle 'Events Alerts Identifying deployed endpoints'

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

event_notifications_table_arn_export="$EVENTS_PROCESSOR_STACK_NAME-EventNotificationsTableArn"
event_notifications_table_arn=$(echo $stack_exports \
    | jq -r --arg event_notifications_table_arn_export "$event_notifications_table_arn_export" \
    '.Exports[] | select(.Name==$event_notifications_table_arn_export) | .Value')

event_notifications_table_export="$EVENTS_PROCESSOR_STACK_NAME-EventNotificationsTable"
event_notifications_table=$(echo $stack_exports \
    | jq -r --arg event_notifications_table_export "$event_notifications_table_export" \
    '.Exports[] | select(.Name==$event_notifications_table_export) | .Value')

event_notifications_stream_arn_export="$EVENTS_PROCESSOR_STACK_NAME-EventNotificationsStreamArn"
event_notifications_stream_arn=$(echo $stack_exports \
    | jq -r --arg event_notifications_stream_arn_export "$event_notifications_stream_arn_export" \
    '.Exports[] | select(.Name==$event_notifications_stream_arn_export) | .Value')

event_config_table_arn_export="$EVENTS_PROCESSOR_STACK_NAME-EventConfigTableArn"
event_config_table_arn=$(echo $stack_exports \
    | jq -r --arg event_config_table_arn_export "$event_config_table_arn_export" \
    '.Exports[] | select(.Name==$event_config_table_arn_export) | .Value')

event_config_table_export="$EVENTS_PROCESSOR_STACK_NAME-EventConfigTable"
event_config_table=$(echo $stack_exports \
    | jq -r --arg event_config_table_export "$event_config_table_export" \
    '.Exports[] | select(.Name==$event_config_table_export) | .Value')

dax_cluster_endpoint_export="$EVENTS_PROCESSOR_STACK_NAME-DAXClusterEndpoint"
dax_cluster_endpoint=$(echo $stack_exports \
    | jq -r --arg dax_cluster_endpoint_export "$dax_cluster_endpoint_export" \
    '.Exports[] | select(.Name==$dax_cluster_endpoint_export) | .Value')


application_configuration_override=$(cat $CONFIG_LOCATION)

logTitle 'Deploying the Event Alerts CloudFormation template '
aws cloudformation deploy \
  --template-file "$cwd/build/cfn-eventsAlerts-output.yml" \
  --stack-name ${STACK_NAME} \
  --parameter-overrides \
      Environment=${ENVIRONMENT} \
      ApplicationConfigurationOverride="$application_configuration_override" \
      EventNotificationsTable=$event_notifications_table \
      EventNotificationsTableArn=$event_notifications_table_arn \
      EventNotificationsStreamArn=$event_notifications_stream_arn \
      EventConfigTable=$event_config_table \
      KmsKeyId=$KMS_KEY_ID \
      EventConfigTableArn=$event_config_table_arn \
      DAXClusterEndpoint=$dax_cluster_endpoint \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Event Alerts deployment complete'
