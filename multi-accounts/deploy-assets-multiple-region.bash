#!/bin/bash

set -e

CDF_LOCATION=$(pwd)
source "$CDF_LOCATION/source/infrastructure/common-deploy-functions.bash"

function help_message {
    cat << EOF

NAME:
    deploy-assets-multiple-regions.bash

DESCRIPTION:
    Deploys assets in multiple regions.

MANDATORY ARGUMENTS:
====================
    -p (string)   Name of the Bucket Prefix
    -b (string)   Name of the Template Bucket
    -r (string)   List of supported regions separated by space
    -v (string)   Version of the template

OPTIONAL ARGUMENTS

    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.

DEPENDENCIES REQUIRED:

    - aws-cli
    - jq
    - zip

EOF
}

##########################################################
######  parse and validate the provided arguments   ######
##########################################################
while getopts ":b:p:r:v:R:P:" opt; do
  case $opt in
    b  ) export TEMPLATE_BUCKET_NAME=$OPTARG;;
    p  ) export BUCKET_NAME_PREFIX=$OPTARG;;
    r  ) export SUPPORTED_REGIONS=$OPTARG;;
    v  ) export SOLUTION_VERSION=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

if [[ "$DEBUG" == "true" ]]; then
    set -x
fi


IFS=' ' read -ra SUPPORTED_REGIONS_ARRAY <<< "$SUPPORTED_REGIONS"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
SOLUTION_NAME="aws-connected-device-framework"

###########################################################################
######  transform CDF templates to work in multi account environment ######
###########################################################################
cd "$CDF_LOCATION"/multi-accounts

./build-s3-dist.sh "$BUCKET_NAME_PREFIX" "$SOLUTION_NAME" "$SOLUTION_VERSION" "$TEMPLATE_BUCKET_NAME"

global_s3_assets="$CDF_LOCATION"/multi-accounts/global-s3-assets
regional_s3_assets="$CDF_LOCATION"/multi-accounts/regional-s3-assets

cd "$global_s3_assets"

for region in "${SUPPORTED_REGIONS_ARRAY[@]}"
do
    artifact_key="${BUCKET_NAME_PREFIX}-${region}/$SOLUTION_NAME/$SOLUTION_VERSION"
    aws s3 sync --acl bucket-owner-full-control $AWS_ARGS . "s3://${artifact_key}"
done

cd "$regional_s3_assets"
for region in "${SUPPORTED_REGIONS_ARRAY[@]}"
do
    artifact_key="${BUCKET_NAME_PREFIX}-${region}/$SOLUTION_NAME/$SOLUTION_VERSION"
    aws s3 sync --acl bucket-owner-full-control $AWS_ARGS . "s3://${artifact_key}"
done