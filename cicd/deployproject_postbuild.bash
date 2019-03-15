#!/bin/bash

set -e

echo deployproject_postbuild started on `date`


function publish_artifacts() {
    buildId=$1
    basedir=$(pwd)

    coreBundleName="cdf-core-$1.zip"
    coreReleasedir=$basedir/../bundled-core
    rm -rf $coreReleasedir
    mkdir -p $coreReleasedir
    
    clientsBundleName="cdf-clients-$1.zip"
    clientsReleasedir=$basedir/../bundled-clients
    rm -rf $clientsReleasedir
    mkdir -p $clientsReleasedir

    docsBundleName="cdf-documentation-$1.zip"
    docsReleasedir=$basedir/documentation/site

    ### copy the main infrastructure scripts/templates
    cp -R $basedir/infrastructure $coreReleasedir/infrastructure

    ### copy each of the pre-compiled packages along with its related infrastructure scripts/templates
    cd $basedir/packages/services
    for package in */; do
        echo Copying $package bundle...
        mkdir -p $coreReleasedir/packages/services/$package/build
        cp $package/build/build.zip $coreReleasedir/packages/services/$package/build/build.zip
        cp -R $package/infrastructure $coreReleasedir/packages/services/$package/infrastructure
    done

    ### copy each of the pre-compiled clients
    cd $basedir/packages/libraries/clients
    for package in */; do
        echo Copying $package bundle...
        mkdir -p $clientsReleasedir/packages/libraries/clients/$package/build
        cp $package/build/build.zip $clientsReleasedir/packages/libraries/clients/$package/build/build.zip
    done

    ### compile the documentation
    cd $basedir/documentation
    ./compile_documentation.bash

    ### zip and save the bundles to s3
    cd $coreReleasedir
    echo Zipping "$coreReleasedir" to "$coreBundleName"
    zip -r "$coreBundleName" .
    echo Uploading "$coreBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$coreBundleName"
    aws s3 cp "$coreBundleName" "$ARTIFACT_PUBLISH_LOCATION/$coreBundleName" &

    cd $clientsReleasedir
    echo Zipping "$clientsReleasedir" to "$clientsBundleName"
    zip -r "$clientsBundleName" .
    echo Uploading "$clientsBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$clientsBundleName"
    aws s3 cp "$clientsBundleName" "$ARTIFACT_PUBLISH_LOCATION/$clientsBundleName" &

    cd $docsReleasedir
    echo Zipping "$docsReleasedir" to "$docsBundleName"
    zip -r "$docsBundleName" .
    echo Uploading "$docsBundleName" to "$ARTIFACT_PUBLISH_LOCATION/$docsBundleName"
    aws s3 cp "$docsBundleName" "$ARTIFACT_PUBLISH_LOCATION/$docsBundleName" &


    ### push the documentation up to our public site
    #TODO: make this configurable
    aws s3 sync $docsReleasedir "$DOCUMENTATION_PUBLISH_LOCATION" &

    wait
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

    buildId=$(date -u +%Y%m%d%H%M%S)
    tagNames[0]="RELEASE-$DEPLOY_ENV-$buildId"
    tagNames[1]="RELEASE-$DEPLOY_ENV-LATEST"
    
    for tagName in "${tagNames[@]}"; do 
        git tag -f $tagName
        git push -f origin $tagName
    done

    ### Next, if this was a live deploy, publish the artifacts as an installable package
    if [[ "$DEPLOY_ENV" = "LIVE" ]]; then
        echo publishing artifacts...
        publish_artifacts "$buildId"
    fi

fi
