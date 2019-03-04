#!/bin/sh

set -e

echo buildproject_postbuild started on `date`

echo versioning...
export GIT_CREDENTIALS="$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD"
pnpm run semantic-release
