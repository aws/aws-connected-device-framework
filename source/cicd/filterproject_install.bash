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

echo filterproject_install started on `date`

env | sort

echo Adding workaround for unsupported characters in the auto-generated codecommit passwords
export ESCAPED_CREDENTIALS=$(echo "$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD" | sed -r 's:/:%2F:g' )

echo Adding workaround for CodeCommit not cloning source as git
cd $CODEBUILD_SRC_DIR/..
git clone "https://$ESCAPED_CREDENTIALS@git-codecommit.$AWS_REGION.amazonaws.com/v1/repos/$REPO_NAME" temp_src
cd temp_src && git checkout $CODEBUILD_RESOLVED_SOURCE_VERSION && cd ..
rm -rf "$CODEBUILD_SRC_DIR/*"
cp -a temp_src/. "$CODEBUILD_SRC_DIR/" && rm -rf temp_src

echo configuring git
cd $CODEBUILD_SRC_DIR
git config user.email "$CDF_CODECOMMIT_EMAIL"
git config user.name "$CDF_CODECOMMIT_USERNAME"
