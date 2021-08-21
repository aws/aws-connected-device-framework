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
    Deploys the Simulation Launcher.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -l (string)   Custom Resource Lambda Arn
    -k (string)   KMS Key Id

OPTIONAL ARGUMENTS:
===================

    Required for private api auth:
    --------------------------------------------------------
    -v (string)   ID of VPC to deploy into
    -n (string)   ID of private subnets (comma delimited) to deploy into

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}

while getopts ":e:c:l:k:v:n:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    l  ) export CUSTOM_RESOURCE_LAMBDA_ARN=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;

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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CUSTOM_RESROUCE_LAMBDA_ARN l "$CUSTOM_RESOURCE_LAMBDA_ARN")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k "$KMS_KEY_ID")))


if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )
STACK_NAME=cdf-simulation-launcher-${ENVIRONMENT}

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS

  KMS_KEY_ID:                       $KMS_KEY_ID

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")
root_dir=$(pwd)

repositoryName="cdf-jmeter-$ENVIRONMENT"
$root_dir/src/containers/jmeter/infrastructure/deploy.bash -n $repositoryName $AWS_SCRIPT_ARGS

logTitle 'Deploying the Simulation Launcher CloudFormation template'
application_configuration_override=$(cat $CONFIG_LOCATION)

simulation_bucket=$(echo $application_configuration_override | jq -r '.aws.s3.bucket')

aws cloudformation deploy \
  --template-file $cwd/build/cfn-simulation-launcher-output.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      JmeterRepoName=$repositoryName \
      VpcId=$VPC_ID \
      PublicSubNetIds=$PRIVATE_SUBNET_IDS \
      CustomResourceLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
      KmsKeyId=$KMS_KEY_ID \
      BucketName=$simulation_bucket \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

logTitle 'Simulation Launcher deployment done!'
