#!/bin/sh

set -e

echo buildproject_prebuild_prehook started on `date`

cwd=$(pwd)

# build all the dependant libraries
cd $CODEBUILD_SRC_DIR_gitified_libraries/core/errors
npm i

cd $CODEBUILD_SRC_DIR_gitified_libraries/core/logger
npm i

cd $CODEBUILD_SRC_DIR_gitified_libraries/config/config-inject
npm i
cd $cwd
