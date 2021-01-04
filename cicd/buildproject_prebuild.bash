#!/bin/bash

set -e

echo buildproject_prebuild started on `date`

echo Checking to see if we have changes that need committing...
set +e
git diff --quiet; differences=$?
set -e
if [ $differences -eq 1 ]; then
    echo Yes we have changes, lets commit them...
    # package-lock.json probably changed.  needs committing for the npm versioning to function
    git commit -am 'ci(@cdf) buildproject_prebuild [skip ci]'
    git push origin HEAD:$BRANCH
fi

echo Installing...
rush update

echo Enforcing the need for change log
rush change -v

