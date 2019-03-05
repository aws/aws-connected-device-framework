#!/bin/sh

set -e

echo deployproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo tagging release...
    tagName="RELEASE-$(date -u +%Y%m%d%H%M%S)"
    git tag $tagName
    git push origin $tagName

fi
