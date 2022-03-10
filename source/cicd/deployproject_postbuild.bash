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

function publish_artifacts() {
    buildId=$1
    basedir=$(pwd)

    coreBundleName="aws-connected-device-framework-$1.tar"
    changeLogsBundleName="cdf-changeLogs-$1.tar"
    docsBundleName="cdf-documentation-$1.tar"
    docsReleaseDir="$basedir/source/documentation/site"


    cd $basedir
    echo Tarring core to "$coreBundleName"
    tar -cvf ../$coreBundleName --exclude=node_modules --exclude=.git --exclude=dist --exclude=deploy --exclude=.history --exclude=temp .
    echo Uploading "$coreBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$coreBundleName"
    aws s3 cp "../$coreBundleName" "$ARTIFACT_PUBLISH_LOCATION/core/$coreBundleName"
}

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

### Next, if this was a live deploy, publish the artifacts as an installable package
if [[ "$DEPLOY_ENV" = "LIVE" ]]; then
    echo publishing artifacts...
    publish_artifacts "$buildId"
fi