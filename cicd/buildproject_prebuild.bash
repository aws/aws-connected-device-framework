#!/bin/bash

set -e

echo buildproject_prebuild started on `date`

echo Installing...
pnpm i

echo Checking to see if we have changes that need committing...
set +e
git diff --quiet; differences=$?
set -e
if [ $differences -eq 1 ]; then
    echo Yes we have changes, lets commit them...
    # package-lock.json probably changed.  needs committing for the npm versioning to function
    git commit -am 'ci(@cdf) buildproject_prebuild [skip ci]'
fi


