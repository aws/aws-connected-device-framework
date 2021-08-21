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

function help_message {
    cat << EOF

NAME
    deploy.bash    

DESCRIPTION
    Builds and deploys the CDF Jmeter container.

MANDATORY ARGUMENTS:
    -r (string)  Repository URI
    -n (string)  Repository Name

OPTIONAL ARGUMENTS
    -b (flag)     Build Image before publishing   
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}

while getopts ":r:n:bR:P:" opt; do
  case $opt in
    r  ) export REPOSITORY_URI=$OPTARG;;
    n  ) export REPOSITORY_NAME=$OPTARG;;
    b  ) export BUILD_IMAGE=true;;
    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


echo "
Running with:
  REPOSITORY_URI:                   $REPOSITORY_URI
  REPOSITORY_NAME:                  $REPOSITORY_NAME
  BUILD_IMAGE:                      $BUILD
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE                
"

cwd=$(dirname "$0")


if [ "$BUILD_IMAGE" = "true" ]; then
  $cwd/bundle.bash
fi

image_tag="cdf-jmeter"
repositoryUri=$REPOSITORY_URI
repositoryName=$REPOSITORY_NAME

if [ -n "$REPOSITORY_NAME" ]; then
  repos=$(aws ecr describe-repositories $AWS_ARGS)
  repositoryUri=$(echo $repos \
      | jq -r --arg repositoryName "$repositoryName" \
      '.repositories[] | select(.repositoryName==$repositoryName) | .repositoryUri')

  if [ -z "$repositoryUri" ]; then
    echo "Repo $repositoryName does not exist, therefore creating"
    aws ecr create-repository --repository-name $repositoryName $AWS_ARGS
    repos=$(aws ecr describe-repositories $AWS_ARGS)
    repositoryUri=$(echo $repos \
        | jq -r --arg repositoryName "$repositoryName" \
        '.repositories[] | select(.repositoryName==$repositoryName) | .repositoryUri')
  fi
fi

aws ecr get-login-password $AWS_ARGS | docker login --username AWS --password-stdin $repositoryUri

docker tag $image_tag "$repositoryUri"
docker push "$repositoryUri"

echo "Done!"
