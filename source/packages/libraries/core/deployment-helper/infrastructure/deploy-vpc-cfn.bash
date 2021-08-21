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
    -v (string)   ID of VPC to deploy into
    -g (string)   ID of CDF security group
    -n (string)   ID of private subnets (comma delimited) to deploy into


OPTIONAL ARGUMENTS
===================

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:a:v:g:n:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    a  ) export ARTIFACTS_BUCKET=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ARTIFACTS_BUCKET a "$ARTIFACTS_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument VPC_ID v "$VPC_ID")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CDF_SECURITY_GROUP_ID g "$CDF_SECURITY_GROUP_ID")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIVATE_SUBNET_IDS n "$PRIVATE_SUBNET_IDS")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

STACK_NAME=cdf-deployment-helper-vpc-${ENVIRONMENT}

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $ARTIFACTS_BUCKET

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


logTitle 'Deploying Deployment Helper VPC template'

aws cloudformation deploy \
  --template-file $cwd/build/cfn-deployment-helper-vpc-output.yaml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ArtifactsBucket=$ARTIFACTS_BUCKET \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      VpcId=$VPC_ID \
      PrivateSubnetIds=$PRIVATE_SUBNET_IDS \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Deployment Helper deployment VPC complete!'
