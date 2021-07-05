#!/bin/bash

set -e

echo deployproject_postbuild started on `date`

function publish_artifacts() {
    buildId=$1
    basedir=$(pwd)

    coreBundleName="cdf-core-$1.tar"
    changeLogsBundleName="cdf-changeLogs-$1.tar"
    docsBundleName="cdf-documentation-$1.tar"
    docsReleaseDir="$basedir/documentation/site"


    cd $basedir
    echo Tarring core to "$coreBundleName"
    tar -cvf ../$coreBundleName --exclude=./documentation --exclude=node_modules --exclude=.git .
    echo Uploading "$coreBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$coreBundleName"
    aws s3 cp "../$coreBundleName" "$ARTIFACT_PUBLISH_LOCATION/core/$coreBundleName" &

    echo Tarring changeLogs to "$changeLogsBundleName"
    find . -name CHANGELOG.md -path "./packages/*" | tar -cvf ../$changeLogsBundleName -T -
    echo Uploading "$changeLogsBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$changeLogsBundleName"
    aws s3 cp "../$changeLogsBundleName" "$ARTIFACT_PUBLISH_LOCATION/changeLogs/$changeLogsBundleName" &

    ### compile the documentation
    cd $basedir/documentation
    ./compile_documentation.bash

    echo Tarring docs to "$docsBundleName"
    cd $docsReleaseDir
    tar -cvf ../../../$docsBundleName .
    echo Uploading "$docsBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$docsBundleName"
    aws s3 cp "../../../$docsBundleName" "$ARTIFACT_PUBLISH_LOCATION/docs/$docsBundleName" &

    ### push the documentation up to our public site
    aws s3 sync $docsReleaseDir "$DOCUMENTATION_PUBLISH_LOCATION" &

    wait
}

if [ "$CI_JOB_STATUS" = "success" ]; then

    ### If the deploy was successful ....

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

fi
