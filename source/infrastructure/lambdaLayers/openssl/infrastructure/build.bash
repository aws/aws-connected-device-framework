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

function help_message {
    cat << EOF

NAME
    build.bash    

DESCRIPTION
    Builds the openssl lambda layer.

EOF
}


cwd=$(pwd)
rm -rf $cwd/build
mkdir -p $cwd/build

echo '
**********************************************************
  Building the OpenSSL lambda layer
**********************************************************
'

docker image build --platform linux/amd64 -t cdf-openssl-lambda-layer .

local_build_dir=$(pwd)/build

docker run --rm -v "$local_build_dir":/tmp/build cdf-openssl-lambda-layer


echo '
**********************************************************
  OpenSSL lambda layer Done!
**********************************************************
'
