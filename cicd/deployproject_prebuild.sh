#!/bin/sh

set -e

echo deployproject_prebuild started on `date`

echo Bundling...
pnpm m run bundle
