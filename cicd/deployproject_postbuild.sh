#!/bin/sh

set -e

echo deployproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo tagging release...
    if [[ $ENVIRONMENT == *"-staging" ]]; then
        tagNames=("RELEASE-STAGING-$(date -u +%Y%m%d%H%M%S)" "RELEASE-STAGING-LATEST")
    else
        tagNames=("RELEASE-LIVE-$(date -u +%Y%m%d%H%M%S)" "RELEASE-LIVE-LATEST")
    fi
    
    for tagName in "${tagNames[@]}"; do 
        git tag -fa $tagName
        git push origin $tagName
    done

fi
