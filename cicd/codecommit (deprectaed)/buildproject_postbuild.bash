#!/bin/bash

set -e

echo buildproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo Adding workaround for unsupported characters in the auto-generated codecommit passwords
    ### pnpm requires GIT_CREDENTIALS configuring for when it pushes version changes to codecommit 
    export GIT_CREDENTIALS=$(echo "$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD" | sed -r 's:/:%2F:g' )

    echo Applying version updates
    rush publish -a

    echo Committing updated files
    set +e
    git diff --quiet; differences=$?
    set -e
    if [ $differences -eq 1 ]; then
        git commit -am 'ci(@cdf) buildproject_prebuild [skip ci]'
        git push origin HEAD:$BRANCH
    fi

    echo Bundling...
    infrastructure/bundle-core.bash

fi
