#!/bin/sh

set -e

echo buildproject_build started on `date`

printenv | sort

echo Running tests...
npm run test

echo Versioning...
npm version patch
