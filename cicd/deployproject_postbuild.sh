#!/bin/sh

set -e

echo deployproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo tagging release...
    if [[ $ENVIRONMENT == *"-staging" ]]; then
        tagName="RELEASE-STAGING-$(date -u +%Y%m%d%H%M%S)"
    else
        tagName="RELEASE-LIVE-$(date -u +%Y%m%d%H%M%S)"
    fi
    
    git tag $tagName
    git push origin $tagName

fi
