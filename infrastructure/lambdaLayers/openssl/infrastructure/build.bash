#!/bin/bash
set -e

#-------------------------------------------------------------------------------
# Copyright (c) 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------

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

docker image build -t cdf-openssl-lambda-layer .

local_build_dir=$(pwd)/build

docker run --rm -v "$local_build_dir":/tmp/build cdf-openssl-lambda-layer


echo '
**********************************************************
  OpenSSL lambda layer Done!
**********************************************************
'