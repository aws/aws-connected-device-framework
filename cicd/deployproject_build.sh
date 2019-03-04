#!/bin/sh

set -e

echo deployproject_build started on `date`

export ASSETLIBRARY_CONFIG_LOCATION="$CODEBUILD_SRC_DIR_source_infrastructure/assetlibrary/${ENVIRONMENT}-config.json"

bash -c packages/services/assetlibrary/infrastructure/package-cfn.bash
bash -c packages/services/assetlibrary/infrastructure/deploy-cfn.bash
