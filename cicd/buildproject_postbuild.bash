#!/bin/bash

set -e

echo buildproject_postbuild started on `date`

if [ "$CODEBUILD_BUILD_SUCCEEDING" -eq 1 ]; then

    echo versioning...
    echo Adding workaround for unsupported characters in the auto-generated codecommit passwords
    ### pnpm requires GIT_CREDENTIALS configuring for when it pushes version changes to codecommit 
    export GIT_CREDENTIALS=$(echo "$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD" | sed -r 's:/:%2F:g' )

    ### using the default concurrency of 4 causes CodeCommit to throw 429 errors, therefore perform the semantic release using just 1 thread
    pnpm m run semantic-release --workspace-concurrency 1

    echo Bundling...
    infrastructure/bundle-core.bash

fi
