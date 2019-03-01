#!/bin/sh

set -e

echo buildproject_build_prehook started on `date`

cwd=$(pwd)

# build all the dependant libraries
cd $CODEBUILD_SRC_DIR_gitified_libraries/core/errors
npm run build

cd $CODEBUILD_SRC_DIR_gitified_libraries/core/logger
npm run build

cd $CODEBUILD_SRC_DIR_gitified_libraries/config/config-inject
npm run build
cd $cwd
