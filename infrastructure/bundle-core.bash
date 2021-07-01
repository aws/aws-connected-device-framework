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
        infrastructure/build-kaniko.bash
    done
fi

cd $root_dir
rush purge                      # delete all rush temp files
rush update                     # as temp files deleted, need to refresh dependencies
rush clean                      # deep clean of compiled files
rush update                     # refresh dependencies again
rush build                      # compile
npx pnpm recursive run bundle   # create the deployment packages

# wait
