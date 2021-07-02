#!/bin/bash

set -e
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi

function help_message {
    cat << EOF

NAME

    bundle-core.bash    

DESCRIPTION

    Bundles the CDF core services as well as any dependant lambda layers, ready for deployment.

DEPENDENCIES REQUIRED:

    - docker
    
EOF
}

root_dir=$(pwd)

if [ -z "$BYPASS_CDF_DOCKER_BUILD" ]; then
    lambda_layers_root="$root_dir/infrastructure/lambdaLayers"
    for layer in $(ls $lambda_layers_root); do
        cd "$lambda_layers_root/$layer"
        # infrastructure/build.bash &
        # infrastructure/build-kaniko.bash
    done
fi

cd $root_dir
node common/scripts/install-run-rush.js purge                      # delete all rush temp files
node common/scripts/install-run-rush.js update                     # as temp files deleted, need to refresh dependencies
node common/scripts/install-run-rush.js clean                      # deep clean of compiled files
node common/scripts/install-run-rush.js update                     # refresh dependencies again
node common/scripts/install-run-rush.js build                      # compile
npx pnpm recursive run bundle   # create the deployment packages

# wait
