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
GREENGRASS_PROVISIONING_STACK_NAME="cdf-greengrass2-provisioning-$ENVIRONMENT"
DEVICE_PATCHER_STACK_NAME="cdf-device-patcher-$ENVIRONMENT"
COMMAND_AND_CONTROL_STACK_NAME="cdf-commandandcontrol-$ENVIRONMENT"

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

commandandcontrol_invoke_url_export="$COMMAND_AND_CONTROL_STACK_NAME-apigatewayurl"
commandandcontrol_invoke_url=$(echo $stack_exports \
    | jq -r --arg commandandcontrol_invoke_url_export "$commandandcontrol_invoke_url_export" \
    '.Exports[] | select(.Name==$commandandcontrol_invoke_url_export) | .Value')

bulkcerts_invoke_url_export="$BULKCERTS_STACK_NAME-apigatewayurl"
bulkcerts_invoke_url=$(echo $stack_exports \
    | jq -r --arg bulkcerts_invoke_url_export "$bulkcerts_invoke_url_export" \
    '.Exports[] | select(.Name==$bulkcerts_invoke_url_export) | .Value')

notifications_invoke_url_export="$NOTIFICATIONS_STACK_NAME-apigatewayurl"
notifications_invoke_url=$(echo $stack_exports \
    | jq -r --arg notifications_invoke_url_export "$notifications_invoke_url_export" \
    '.Exports[] | select(.Name==$notifications_invoke_url_export) | .Value')

greengrass_provisioning_invoke_url_export="$GREENGRASS_PROVISIONING_STACK_NAME-apigatewayurl"
greengrass_provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg greengrass_provisioning_invoke_url_export "$greengrass_provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$greengrass_provisioning_invoke_url_export) | .Value')

devicepatcher_invoke_url_export="$DEVICE_PATCHER_STACK_NAME-apigatewayurl"
devicepatcher_invoke_url=$(echo $stack_exports \
    | jq -r --arg devicepatcher_invoke_url_export "$devicepatcher_invoke_url_export" \
    '.Exports[] | select(.Name==$devicepatcher_invoke_url_export) | .Value')

echo creating staging integration test config...

export CONFIG_LOCATION="${CODEBUILD_SRC_DIR_source_infrastructure}/integration-tests/.env.${ENVIRONMENT}"

sed -i.bak '/.*BASE_URL.*/ d' $CONFIG_LOCATION

echo "GREENGRASS2PROVISIONING_BASE_URL=${greengrass_provisioning_invoke_url}" >> $CONFIG_LOCATION
echo "NOTIFICATIONS_BASE_URL=${notifications_invoke_url}" >> $CONFIG_LOCATION
echo "PROVISIONING_BASE_URL=${provisioning_invoke_url}" >> $CONFIG_LOCATION
echo "DEVICE_PATCHER_BASE_URL=${devicepatcher_invoke_url}" >> $CONFIG_LOCATION
echo "BULKCERTS_BASE_URL=${bulkcerts_invoke_url}" >> $CONFIG_LOCATION
echo "COMMANDS_BASE_URL=${commands_invoke_url}" >> $CONFIG_LOCATION
echo "ASSETLIBRARYHISTORY_BASE_URL=${assetlibraryhistory_invoke_url}" >> $CONFIG_LOCATION
echo "ASSETLIBRARY_BASE_URL=${assetlibrary_invoke_url}" >> $CONFIG_LOCATION
echo "COMMANDANDCONTROL_BASE_URL=${commandandcontrol_invoke_url}" >> $CONFIG_LOCATION


echo "\naugmented configuration:\n$(cat $CONFIG_LOCATION)\n"

export APP_CONFIG_DIR="$(pwd)/source/packages/integration-tests/src/config"

echo running integration tests...

cd source/packages/integration-tests
npm config set @cdf/integration-tests:environment $ENVIRONMENT
npm run clean
npm run build
npm run integration-test -- "features/device-patcher/*.feature"
npm run integration-test -- "features/provisioning/*.feature"
npm run integration-test -- "features/assetlibrary/$ASSETLIBRARY_MODE/*.feature"
# TODO: fix asset library history tests
#npm run integration-test -- "features/assetlibraryhistory/*.feature"
npm run integration-test -- "features/greengrass2-provisioning/*.feature"
npm run integration-test -- "features/bulkcerts/*.feature"
npm run integration-test -- "features/commands/*.feature"
npm run integration-test -- "features/notifications/*.feature"
npm run integration-test -- "features/commandandcontrol/*.feature"


