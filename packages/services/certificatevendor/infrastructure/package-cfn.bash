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
    package-cfn.bash    

DESCRIPTION
    Packages the cdf-certificatevendor service, ready for deployment.

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

if [ -z "$DEPLOY_ARTIFACTS_STORE_BUCKET" ]; then
	echo -b DEPLOY_ARTIFACTS_STORE_BUCKET is required; help_message; exit 1;
fi

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument DEPLOY_ARTIFACTS_STORE_BUCKET b $DEPLOY_ARTIFACTS_STORE_BUCKET)))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )

cwd=$(dirname "$0")
mkdir -p $cwd/build


logTitle 'Packaging the Certificate Vendor CloudFormation template and uploading to S3'

aws cloudformation package \
  --template-file $cwd/cfn-certificatevendor.yml \
  --output-template-file $cwd/build/cfn-certificatevendor-output.yml \
  --s3-bucket $DEPLOY_ARTIFACTS_STORE_BUCKET \
  $AWS_ARGS

logTitle 'Certificate Vendor packaging complete!'