#!/bin/sh

set -e

echo buildproject_postbuild started on `date`

echo versioning...
echo Adding workaround for unsupported characters in the auto-generated codecommit passwords
export GIT_CREDENTIALS=$(echo "$CDF_CODECOMMIT_USERNAME:$CDF_CODECOMMIT_PASSWORD" | sed -r 's:/:%2F:g' )
pnpm m run semantic-release -- --debug
