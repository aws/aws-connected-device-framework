#!/bin/bash

set -e

echo deployproject_build started on `date`

# regardless of which environment we're deploying to, staging/live always use the same config
CONFIG_ENVIRONMENT=${ENVIRONMENT%-staging}

export ASSETLIBRARY_CONFIG_LOCATION="$CODEBUILD_SRC_DIR_source_infrastructure/assetlibrary/${CONFIG_ENVIRONMENT}-config.json"
echo deploying using configuration from $ASSETLIBRARY_CONFIG_LOCATION


bash -c packages/services/assetlibrary/infrastructure/package-cfn.bash
bash -c packages/services/assetlibrary/infrastructure/deploy-cfn.bash
