#!/bin/bash

set -e

echo filterproject_prebuild started on `date`

cd $CODEBUILD_SRC_DIR

#  retrieve the latest git message for this specific commit
git_commit_message="$(git log --format=%B -n 1)"
echo git_commit_message: $git_commit_message

# don't proceed if the commit was made by the CICD pipeline
#if [[ $git_commit_message == "[CICD]:"* ]]; then
if [[ $git_commit_message == *"[skip ci]"* ]]; then
    echo A CICD commit, therefore ignoring
    exit 1
fi

exit 0