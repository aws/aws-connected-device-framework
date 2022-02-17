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

echo deployproject_build started on `date`

echo Running deploy using the installer project

cd source/packages/services/installer

npm run clean
npm run build

echo Running the deployment

node --unhandled-rejections=warn-with-error-code dist/index.js deploy $ENVIRONMENT $AWS_REGION -c $CODEBUILD_SRC_DIR_source_infrastructure/installerv2/$ENVIRONMENT.json