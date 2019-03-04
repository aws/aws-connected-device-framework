#!/bin/sh

set -e

echo deployproject_prebuild started on `date`

echo files...
ls -la

echo Bundling...
pnpm m run bundle
