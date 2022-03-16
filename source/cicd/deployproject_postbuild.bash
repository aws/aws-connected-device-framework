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

echo deployproject_postbuild started on `date`

### First lets tag this release so we can always identify specific version of source code...
echo tagging release...
if [[ $ENVIRONMENT == *"-staging" ]]; then
    DEPLOY_ENV='STAGING'
else
    DEPLOY_ENV='LIVE'
fi

buildId=$(date -u +%Y%m%d%H%M%S)
tagNames[0]="RELEASE-$DEPLOY_ENV-$buildId"
tagNames[1]="RELEASE-$DEPLOY_ENV-LATEST"

for tagName in "${tagNames[@]}"; do 
    git tag -f $tagName
    git push -f origin $tagName
done

echo DEPLOY_ENV $DEPLOY_ENV