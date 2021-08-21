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
source ../../../../infrastructure/common-deploy-functions.bash


function help_message {
    cat << EOF

NAME
    deploy-cfn.bash    

DESCRIPTION
    Deploys the CDF Deployment Helper Service

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -a (string)   Artifacts Bucket Name.
    -v (string)   ID of Existing VPC for VPC endpoint checks



OPTIONAL ARGUMENTS
===================

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:a:v:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    a  ) export ARTIFACTS_BUCKET=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done



incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ARTIFACTS_BUCKET a "$ARTIFACTS_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument VPC_ID v "$VPC_ID")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

STACK_NAME=cdf-deployment-helper-${ENVIRONMENT}

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $ARTIFACTS_BUCKET

  VPC_ID:                           $VPC_ID

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


logTitle 'Deploying Deployment Helper template'

aws cloudformation deploy \
  --template-file $cwd/build/cfn-deployment-helper-output.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ArtifactsBucket=$ARTIFACTS_BUCKET \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      ExistingVpcId=$VPC_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Deployment Helper deployment complete!'
