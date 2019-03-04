#!/bin/sh

set -e

echo deployproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo tagging release...
    tagName="@cdf-RELEASE-$(date +%s)"
    git tag $tagName
    git push origin $tagName

fi
