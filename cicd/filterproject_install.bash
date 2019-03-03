#!/bin/bash

set -e

echo filterproject_install started on `date`

env | sort

echo Adding workaround for unsupported characters in the auto-generated codecommit passwords
export ESCAPED_CREDENTIALS=$(echo "$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD" | sed -r 's:/:%2F:g' )

echo configuring git
git config --global user.email "$CDF_CODECOMMIT_EMAIL"
git config --global user.name "$CDF_CODECOMMIT_USERNAME"

echo Adding workaround for CodeCommit not cloning source as git
cd $CODEBUILD_SRC_DIR

if [ "$BRANCH" = "master" ]; then
    # no need to fetch all the history
    cd .. && git clone --depth=1 "https://$ESCAPED_CREDENTIALS@git-codecommit.$AWS_REGION.amazonaws.com/v1/repos/$REPO_NAME" temp_src
else
    cd .. && git clone "https://$ESCAPED_CREDENTIALS@git-codecommit.$AWS_REGION.amazonaws.com/v1/repos/$REPO_NAME" temp_src
    cd temp_src && git checkout -t origin/$BRANCH && cd ..
fi
rm -rf "$CODEBUILD_SRC_DIR/*"
cp -a temp_src/. "$CODEBUILD_SRC_DIR/" && rm -rf temp_src






