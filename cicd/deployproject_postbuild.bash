#!/bin/bash

set -e

echo deployproject_postbuild started on `date`


function publish_artifacts() {
    bundleName="$1.zip"
    basedir=$(pwd)

    rm -rf $basedir/bundled
    releasedir=$basedir/bundled
    mkdir $releasedir

    ### copy the main infrastructure scripts/templates
    cp -R $basedir/infrastructure $releasedir/infrastructure

    ### copy each of the pre-compiled packages along with its related infrastructure scripts/templates
    for package in $PACKAGES_TO_PUBLISH; do
        mkdir -p $releasedir/packages/services/$package/build
        cp $basedir/packages/services/$package/build/build.zip $releasedir/packages/services/$package/build/build.zip
        cp -R $basedir/packages/services/$package/infrastructure $releasedir/packages/services/$package/infrastructure
    done

    ### copy the integration tests
    cp -R $basedir/packages/integration-tests $releasedir/packages/integration-tests

    ### copy the documentation
    cp -R $basedir/documentation $releasedir/documentation

    ### zip and save to s3
    zip -r "$bundleName" $releasedir/*
    echo Uploading "$bundleName" to "$PUBLISH_LOCATION/$bundleName"
    aws s3 cp "$bundleName" "$PUBLISH_LOCATION/$bundleName"

}



if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    ### If the deploy was successful ....

    ### First lets tag this release so we can always identify specific version of source code...
    echo tagging release...
    if [[ $ENVIRONMENT == *"-staging" ]]; then
        DEPLOY_ENV='STAGING'
    else
        DEPLOY_ENV='LIVE'
    fi

    tagNames[0]="RELEASE-$DEPLOY_ENV-$(date -u +%Y%m%d%H%M%S)"
    tagNames[1]="RELEASE-$DEPLOY_ENV-LATEST"
    
    for tagName in "${tagNames[@]}"; do 
        git tag -f $tagName
        git push -f origin $tagName
    done

    ### Next, if this was a live deploy, publish the artifacts as an installable package
    if [ "$DEPLOY_ENV"="LIVE" ]; then
        echo publishing artifacts...
        publish_artifacts "$tagNames[0]"
    fi

fi
