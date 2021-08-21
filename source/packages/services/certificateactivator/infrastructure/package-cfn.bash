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
    package-cfn.bash

DESCRIPTION
    Packages the cdf-certificateactivator service, ready for deployment.

MANDATORY ARGUMENTS:
    -b (string)   The name of the S3 bucket to deploy CloudFormation templates into.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}
while getopts ":b:R:P:" opt; do
  case $opt in
    b  ) export DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;
    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


incorrect_args=$((incorrect_args+$(verifyMandatoryArgument DEPLOY_ARTIFACTS_STORE_BUCKET b $DEPLOY_ARTIFACTS_STORE_BUCKET)))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )


cwd=$(dirname "$0")
mkdir -p $cwd/build


logTitle 'Packaging the Certificate Activator CloudFormation template and uploading to S3'

aws cloudformation package \
  --template-file $cwd/cfn-certificateactivator.yml \
  --output-template-file $cwd/build/cfn-certificateactivator-output.yml \
  --s3-bucket $DEPLOY_ARTIFACTS_STORE_BUCKET \
  --s3-prefix packaged-cfn-artifacts \
  $AWS_ARGS

logTitle 'Certificate Activator packaging complete!'
