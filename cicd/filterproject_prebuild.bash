#!/bin/bash

set -e

echo filterproject_prebuild started on `date`

printenv | sort

cd $CODEBUILD_SRC_DIR

#  retrieve the latest git commit message for the source.
git_commit_message="$(git log --format=%B -n 1)"

echo git_commit_message: $git_commit_message

if [[ $git_commit_message == CICD* ]; th
    echo A CICD commit, therefore ignoring
    exit 1
else
    echo Proceeding with build
    exit 0
fi
