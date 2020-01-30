#!/bin/bash
set -e

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
    Packages the OpenSSL lambda layer, ready for deployment.

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


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

cwd=$(dirname "$0")
mkdir -p $cwd/build

echo '
**********************************************************
  Packaging the OpenSSL Lambda layer CloudFormation template and uploading to S3
**********************************************************
'
aws cloudformation package \
  --template-file $cwd/cfn-openssl-layer.yml \
  --output-template-file $cwd/build/cfn-openssl-layer-output.yml \
  --s3-bucket $DEPLOY_ARTIFACTS_STORE_BUCKET \
  $AWS_ARGS

echo '
**********************************************************
  OpenSSL Lambda layer Done!
**********************************************************
'