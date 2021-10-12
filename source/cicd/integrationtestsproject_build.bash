#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

set -e

echo integrationtestsproject_build started on `date`



echo determining deployed staging urls...

ASSETLIBRARY_STACK_NAME="cdf-assetlibrary-$ENVIRONMENT"
ASSETLIBRARYHISTORY_STACK_NAME="cdf-assetlibraryhistory-$ENVIRONMENT"
PROVISIONING_STACK_NAME="cdf-provisioning-$ENVIRONMENT"
COMMANDS_STACK_NAME="cdf-commands-$ENVIRONMENT"
BULKCERTS_STACK_NAME="cdf-bulkcerts-$ENVIRONMENT"
NOTIFICATIONS_STACK_NAME="cdf-eventsProcessor-$ENVIRONMENT"
GREENGRASS_DEPLOYMENT_STACK_NAME="cdf-greengrass-deployment-$ENVIRONMENT"
GREENGRASS_PROVISIONING_STACK_NAME="cdf-greengrass-provisioning-$ENVIRONMENT"


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

notifications_invoke_url_export="$NOTIFICATIONS_STACK_NAME-apigatewayurl"
notifications_invoke_url=$(echo $stack_exports \
    | jq -r --arg notifications_invoke_url_export "$notifications_invoke_url_export" \
    '.Exports[] | select(.Name==$notifications_invoke_url_export) | .Value')

greengrass_deployment_invoke_url_export="$GREENGRASS_DEPLOYMENT_STACK_NAME-apigatewayurl"
greengrass_deployment_invoke_url=$(echo $stack_exports \
    | jq -r --arg greengrass_deployment_invoke_url_export "$greengrass_deployment_invoke_url_export" \
    '.Exports[] | select(.Name==$greengrass_deployment_invoke_url_export) | .Value')

greengrass_provisioning_invoke_url_export="$GREENGRASS_PROVISIONING_STACK_NAME-apigatewayurl"
greengrass_provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg greengrass_provisioning_invoke_url_export "$greengrass_provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$greengrass_provisioning_invoke_url_export) | .Value')

echo creating staging integration test config...

LIVE_CONFIG_ENVIRONMENT=${ENVIRONMENT%-staging}
STAGING_CONFIG_ENVIRONMENT=$ENVIRONMENT
export CONFIG_LOCATION="$CODEBUILD_SRC_DIR_source_infrastructure"
STAGING_CONFIG_FILE="${CONFIG_LOCATION}/integration-tests/${STAGING_CONFIG_ENVIRONMENT}-config.json"
LIVE_CONFIG_FILE="${CONFIG_LOCATION}/integration-tests/${LIVE_CONFIG_ENVIRONMENT}-config.json"

echo creating staging config $STAGING_CONFIG_FILE based on $LIVE_CONFIG_FILE
cat $LIVE_CONFIG_FILE | \
  jq \
    --arg assetlibrary_invoke_url "$assetlibrary_invoke_url" \
    --arg assetlibraryhistory_invoke_url "$assetlibraryhistory_invoke_url" \
    --arg provisioning_invoke_url "$provisioning_invoke_url" \
    --arg commands_invoke_url "$commands_invoke_url" \
    --arg bulkcerts_invoke_url "$bulkcerts_invoke_url" \
    --arg notifications_invoke_url "$notifications_invoke_url" \
    --arg greengrass_deployment_invoke_url "$greengrass_deployment_invoke_url" \
    --arg greengrass_provisioning_invoke_url "$greengrass_provisioning_invoke_url" \
  '.assetLibrary.baseUrl=$assetlibrary_invoke_url | .assetLibraryHistory.baseUrl=$assetlibraryhistory_invoke_url | .commands.baseUrl=$commands_invoke_url | .provisioning.baseUrl=$provisioning_invoke_url | .greengrassDeployment.baseUrl=$greengrass_deployment_invoke_url | .greengrassProvisioning.baseUrl=$greengrass_provisioning_invoke_url | .bulkCerts.baseUrl=$bulkcerts_invoke_url | .notifications.baseUrl=$notifications_invoke_url' \
  > $STAGING_CONFIG_FILE

echo "\naugmented configuration:\n$(cat $STAGING_CONFIG_FILE)\n"


echo running integration tests...

cd source/packages/integration-tests
npm config set @cdf/integration-tests:environment $STAGING_CONFIG_ENVIRONMENT
npm run clean
npm run build
npm run integration-test -- "features/provisioning/*.feature"
npm run integration-test -- "features/assetlibrary/$ASSETLIBRARY_MODE/*.feature"

# TODO: fix asset library history tests
#npm run integration-test -- "features/assetlibraryhistory/*.feature"

npm run integration-test -- "features/bulkcerts/*.feature"
npm run integration-test -- "features/commands/*.feature"
npm run integration-test -- "features/notifications/*.feature"

