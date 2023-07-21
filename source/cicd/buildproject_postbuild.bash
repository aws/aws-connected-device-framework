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

echo buildproject_postbuild started on `date`

cd source

echo "enforce need for changelog"
rush change -v

echo "Applying version updates"
rush publish -a

echo Committing updated files
set +e
git add -A
git update-index --refresh
git diff-index --quiet HEAD -- ; differences=$?
set -e
if [ $differences -eq 1 ]; then
    git commit -am 'ci(@awssolutions) buildproject_prebuild [skip ci]'
    git push origin HEAD:$BRANCH
fi

echo Bundling...
infrastructure/bundle-core.bash -z
