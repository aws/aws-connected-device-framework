#!/bin/bash

set -e

echo integrationtestsproject_build started on `date`



echo determining deployed urls...

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
INTEGRATIONTESTS_CONFIG_LOCATION="CODEBUILD_SRC_DIR_source_infrastructure/integration-tests/$CONFIG_ENVIRONMENT-config.json"

echo using configuration from $INTEGRATIONTESTS_CONFIG_LOCATION

cat $INTEGRATIONTESTS_CONFIG_LOCATION | \
  jq \
    --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
    --arg assetlibraryhistory_invoke_url "$assetlibraryhistory_invoke_url" \
    --arg provisioning_invoke_url "$provisioning_invoke_url" \
    --arg commands_invoke_url "$commands_invoke_url" \
    --arg bulkcerts_invoke_url "$bulkcerts_invoke_url" \
  '.assetLibrary.baseUrl=$assetlibrary_invoke_url | .assetLibraryHistory.baseUrl=$assetlibraryhistory_invoke_url | .commands.baseUrl=$commands_invoke_url | .provisioning.baseUrl=$provisioning_invoke_url | .bulkCerts.baseUrl=$bulkcerts_invoke_url' \
  > $INTEGRATIONTESTS_CONFIG_LOCATION.tmp && mv $INTEGRATIONTESTS_CONFIG_LOCATION.tmp $INTEGRATIONTESTS_CONFIG_LOCATION




echo running integration tests...

npm run integration-test -- "features/assetlibrary/$ASSETLIBRARY_MODE/*.feature"


