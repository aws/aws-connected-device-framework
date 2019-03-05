#!/bin/bash

set -e

echo deployproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo tagging release...
    if [[ $ENVIRONMENT == *"-staging" ]]; then
        DEPLOY_ENV='STAGING'
    else
        DEPLOY_ENV='LIVE'
    fi

    tagNames[0]="RELEASE-$DEPLOY_ENV-$(date -u +%Y%m%d%H%M%S)"
    tagNames[1]="RELEASE-$DEPLOY_ENV-LATEST"
    
    for tagName in "${tagNames[@]}"; do 
        git tag -fa $tagName
        git push origin $tagName
    done

fi
