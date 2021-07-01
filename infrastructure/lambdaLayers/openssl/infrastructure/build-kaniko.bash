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

 /kaniko/executor --dockerfile Dockerfile --no-push


echo '
**********************************************************
  OpenSSL lambda layer Done!
**********************************************************
'