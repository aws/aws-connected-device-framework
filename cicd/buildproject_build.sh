#!/bin/sh

set -e

echo buildproject_build started on `date`

printenv | sort

echo Versioning...

pnpm m version patch -- -m "CICD: $npm_package_name %s"
