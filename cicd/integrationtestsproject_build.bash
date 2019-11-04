#!/bin/bash

set -e

echo integrationtestsproject_build started on `date`



echo determining deployed urls...

ASSETLIBRARY_STACK_NAME="cdf-assetlibrary-$ENVIRONMENT"
ASSETLIBRARYHISTORY_STACK_NAME="cdf-assetlibraryhistory-$ENVIRONMENT"
PROVISIONING_STACK_NAME="cdf-provisioning-$ENVIRONMENT"
COMMANDS_STACK_NAME="cdf-commands-$ENVIRONMENT"
BULKCERTS_STACK_NAME="cdf-bulkcerts-$ENVIRONMENT"




stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

assetlibrary_invoke_url_export="$ASSETLIBRARY_STACK_NAME-apigatewayurl"
assetlibrary_invoke_url=$(echo $stack_exports \
    | jq -r --arg assetlibrary_invoke_url_export "$assetlibrary_invoke_url_export" \
    '.Exports[] | select(.Name==$assetlibrary_invoke_url_export) | .Value')

assetlibraryhistory_invoke_url_export="$ASSETLIBRARYHISTORY_STACK_NAME-apigatewayurl"
assetlibraryhistory_invoke_url=$(echo $stack_exports \
    | jq -r --arg assetlibraryhistory_invoke_url_export "$assetlibraryhistory_invoke_url_export" \
    '.Exports[] | select(.Name==$assetlibraryhistory_invoke_url_export) | .Value')

provisioning_invoke_url_export="$PROVISIONING_STACK_NAME-apigatewayurl"
provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_url_export "$provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_url_export) | .Value')

commands_invoke_url_export="$COMMANDS_STACK_NAME-apigatewayurl"
commands_invoke_url=$(echo $stack_exports \
    | jq -r --arg commands_invoke_url_export "$commands_invoke_url_export" \
    '.Exports[] | select(.Name==$commands_invoke_url_export) | .Value')

bulkcerts_invoke_url_export="$BULKCERTS_STACK_NAME-apigatewayurl"
bulkcerts_invoke_url=$(echo $stack_exports \
    | jq -r --arg bulkcerts_invoke_url_export "$bulkcerts_invoke_url_export" \
    '.Exports[] | select(.Name==$bulkcerts_invoke_url_export) | .Value')


echo setting integration test config...

CONFIG_ENVIRONMENT=${ENVIRONMENT%-staging}
export CONFIG_LOCATION="$CODEBUILD_SRC_DIR_source_infrastructure"
export CONFIG_FILE="$CONFIG_LOCATION/integration-tests/$CONFIG_ENVIRONMENT-config.json"

echo using configuration from $CONFIG_FILE

cat $CONFIG_FILE | \
  jq \
    --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
    --arg assetlibraryhistory_invoke_url "$assetlibraryhistory_invoke_url" \
    --arg provisioning_invoke_url "$provisioning_invoke_url" \
    --arg commands_invoke_url "$commands_invoke_url" \
    --arg bulkcerts_invoke_url "$bulkcerts_invoke_url" \
  '.assetLibrary.baseUrl=$assetlibrary_invoke_url | .assetLibraryHistory.baseUrl=$assetlibraryhistory_invoke_url | .commands.baseUrl=$commands_invoke_url | .provisioning.baseUrl=$provisioning_invoke_url | .bulkCerts.baseUrl=$bulkcerts_invoke_url' \
  > $CONFIG_FILE.tmp && mv $CONFIG_FILE.tmp $CONFIG_FILE

echo "\naugmented configuration:\n$(cat $CONFIG_FILE)\n"


echo running integration tests...

cd packages/integration-tests
pnpm run integration-test -- "features/provisioning/*.feature"
pnpm run integration-test -- "features/assetlibrary/$ASSETLIBRARY_MODE/*.feature"

# TODO: fix asset library history tests
#pnpm run integration-test -- "features/assetlibraryhistory/*.feature"

pnpm run integration-test -- "features/bulkcerts/*.feature"
pnpm run integration-test -- "features/commands/*.feature"
