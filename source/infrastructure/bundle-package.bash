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

abspath() {                                               
    cd "$(dirname "$1")"
    printf "%s/%s\n" "$(pwd)" "$(basename "$1")"
}

package_name=$1
echo package_name: $package_name

package_dir=$(pwd)
echo package_dir: $package_dir

monorepo_dir=${package_dir%source/*}
echo monorepo_dir: $monorepo_dir

package_dir_name=${PWD##*/}
rel_deploy_dir="${monorepo_dir}source/deploy/$package_dir_name"
abs_deploy_dir=$(abspath $rel_deploy_dir)
echo abs_deploy_dir: $abs_deploy_dir

npx shx rm -rf $abs_deploy_dir
npx shx rm -rf $package_dir/bundle.zip
npx shx mkdir -p $abs_deploy_dir

rush deploy --overwrite --project @aws-solutions/cdf-$package_name --target-folder $abs_deploy_dir

cd $abs_deploy_dir && zip --symlinks -rq $package_dir/bundle.zip *
