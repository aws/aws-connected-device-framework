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
    Deploys the Asset Library Export Service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -k (string)   KMS Key Id

OPTIONAL ARGUMENTS:
===================

    Required for private api auth:
    --------------------------------------------------------
    -v (string)   ID of VPC to deploy into
    -g (string)   IDs of CDF Security Group
    -n (string)   ID of private subnets (comma delimited) to deploy into
    -s (string)   Schedule expression for the export to run on (like "rate(1 day)" or "cron(0 12 * * ? *)"). Leave off for "on-demand"

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}

while getopts ":e:c:k:v:g:s:n:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    s  ) export SCHEDULE_EXPRESSION=$OPTARG;;

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

SCHEDULE_EXPRESSION="$(defaultIfNotSet 'SCHEDULE_EXPRESSION' s ${SCHEDULE_EXPRESSION} 'N/A')"

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )
STACK_NAME=cdf-assetlibrary-export-${ENVIRONMENT}
NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS
  SCHEDULE_EXPRESSION:              $SCHEDULE_EXPRESSION

  KMS_KEY_ID:                       $KMS_KEY_ID

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

logTitle 'Setting Asset Library Export configuration'

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

neptune_url_export="$NEPTUNE_STACK_NAME-GremlinEndpoint"
neptune_url=$(echo $stack_exports \
    | jq -r --arg neptune_url_export "$neptune_url_export" \
    '.Exports[] | select(.Name==$neptune_url_export) | .Value')

cat $CONFIG_LOCATION | \
  jq --arg neptune_url "$neptune_url" \
  '.neptuneUrl=$neptune_url' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION


logTitle 'Deploying Asset Library Export CloudFormation template'
application_configuration_override=$(cat $CONFIG_LOCATION)

assetlibrary_export_bucket=$(cat $CONFIG_LOCATION | jq -r '.aws.s3.export.bucket')

aws cloudformation deploy \
  --template-file $cwd/build/cfn-assetlibrary-export-output.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      VpcId=$VPC_ID \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
      BucketName=$assetlibrary_export_bucket \
      KmsKeyId=$KMS_KEY_ID \
      NeptuneURL=$neptune_url \
      ExportSchedule=$SCHEDULE_EXPRESSION \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

logTitle 'Asset Library Export deployment done!'
