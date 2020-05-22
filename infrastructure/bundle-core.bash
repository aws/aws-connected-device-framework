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

lambda_layers_root="$root_dir/infrastructure/lambdaLayers"
for layer in $(ls $lambda_layers_root); do
    cd "$lambda_layers_root/$layer"
    infrastructure/build.bash
done

cd $root_dir
npm run bundle
