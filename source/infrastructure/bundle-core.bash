#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------


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
    Builds and deploys the CDF Jmeter container.

OPTIONAL ARGUMENTS
    -r (flag)     Prepare Bundle for Release
    -z (flag)     Bypass cdf docker builds

REQUIREMENTS
    - Docker
    
EOF
}

while getopts ":r:z" opt; do
  case $opt in

    r  ) export RELEASE_PREP=true;;
    z  ) export BYPASS_CDF_DOCKER_BUILD=true;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

cwd=$(dirname "$0")
root_dir=$(pwd)

if [ -z "$BYPASS_CDF_DOCKER_BUILD" ]; then
    lambda_layers_root="$root_dir/infrastructure/lambdaLayers"
    for layer in $(ls $lambda_layers_root); do
        cd "$lambda_layers_root/$layer"
        infrastructure/build.bash
    done
fi

rush install                    # as temp files deleted, need to refresh dependencies
rush build                      # compile

# create the deployment packages
cd $root_dir
rm -rf deploy
mkdir deploy

# pinning to an older version here as latest pnpm (6.20.1) has broken `enable-pre-post-scripts=true`
npx pnpm@6.4.0 recursive run bundle

if [ "$RELEASE_PREP" = "true" ]; then
  rush clean:postrelease            # deep clean of complied files, excluding any bundles
  rush purge                    # delete all rush temp files
fi
