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

#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for all important folders
template_dir="$PWD"
source_dir="$template_dir/../source"

# note:  pnpm@3.5.7 has broken tsc
echo installing rush
npm i -g @microsoft/rush

echo installing jq...
curl -s -qL -o /usr/bin/jq https://stedolan.github.io/jq/download/linux64/jq
chmod +x /usr/bin/jq

echo installing yq
curl -s -qL -o /usr/bin/yq https://github.com/mikefarah/yq/releases/download/3.4.0/yq_linux_amd64
chmod +x /usr/bin/yq

aws --version
yq --version
jq --version
docker --version
