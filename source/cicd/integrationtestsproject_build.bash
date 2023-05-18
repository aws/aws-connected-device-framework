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

ENVIRONMENT=$1
if [ -z "$ENVIRONMENT" ]
then
    ENVIRONMENT='dev'
fi

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
ORGANIZATION_MANAGER_STACK_NAME="cdf-organizationmanager-$ENVIRONMENT"

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

organizationmanager_invoke_url_export="$ORGANIZATION_MANAGER_STACK_NAME-apigatewayurl"
organizationmanager_invoke_url=$(echo $stack_exports \
    | jq -r --arg organizationmanager_invoke_url_export "$organizationmanager_invoke_url_export" \
    '.Exports[] | select(.Name==$organizationmanager_invoke_url_export) | .Value')

iot_ats_endpoint_call=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS)
iot_ats_endpoint=$(echo $iot_ats_endpoint_call \
    | jq -r '.endpointAddress')

account_region_call=$(aws configure get region)
account_region=$(echo $account_region_call)

aws_account_id_call=$(aws sts get-caller-identity)
aws_account_id=$(echo $aws_account_id_call \
    | jq -r '.Account')

echo creating staging integration test config...

CONFIG_LOCATION="$(pwd)/source/packages/integration-tests/.${ENVIRONMENT}.env"
echo -n >$CONFIG_LOCATION

sed -i.bak '/.*BASE_URL.*/ d' $CONFIG_LOCATION
sed -i.bak '/.*AWS.*/ d' $CONFIG_LOCATION
sed -i.bak '/.*POLICY.*/ d' $CONFIG_LOCATION
sed -i.bak '/.*INSTANCETYPE.*/ d' $CONFIG_LOCATION
sed -i.bak '/.*LOGGING_LEVEL.*/ d' $CONFIG_LOCATION

echo "GREENGRASS2PROVISIONING_BASE_URL=${greengrass_provisioning_invoke_url}" >> $CONFIG_LOCATION
echo "NOTIFICATIONS_BASE_URL=${notifications_invoke_url}" >> $CONFIG_LOCATION
echo "PROVISIONING_BASE_URL=${provisioning_invoke_url}" >> $CONFIG_LOCATION
echo "DEVICE_PATCHER_BASE_URL=${devicepatcher_invoke_url}" >> $CONFIG_LOCATION
echo "BULKCERTS_BASE_URL=${bulkcerts_invoke_url}" >> $CONFIG_LOCATION
echo "COMMANDS_BASE_URL=${commands_invoke_url}" >> $CONFIG_LOCATION
echo "ASSETLIBRARYHISTORY_BASE_URL=${assetlibraryhistory_invoke_url}" >> $CONFIG_LOCATION
echo "ASSETLIBRARY_BASE_URL=${assetlibrary_invoke_url}" >> $CONFIG_LOCATION
echo "COMMANDANDCONTROL_BASE_URL=${commandandcontrol_invoke_url}" >> $CONFIG_LOCATION
echo "ORGANIZATIONMANAGER_BASE_URL=${organizationmanager_invoke_url}" >> $CONFIG_LOCATION

echo "AWS_ACCOUNTID=$aws_account_id" >> $CONFIG_LOCATION
echo "AWS_IOT_ENDPOINT=$iot_ats_endpoint" >> $CONFIG_LOCATION
echo "AWS_REGION=$account_region" >> $CONFIG_LOCATION

echo "COMMANDANDCONTROL_TESTDEVICE_POLICYNAME=cdf-integration-tests-cac" >> $CONFIG_LOCATION
echo "COMMANDANDCONTROL_TESTDEVICE_POLICYDOCUMENT={\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Action\":[\"iot:*\"],\"Resource\":[\"arn:aws:iot:${account_region}:${aws_account_id}:*/*\"]},{\"Effect\":\"Allow\",\"Action\":[\"s3:GetBucketPolicy\",\"s3:GetObject\",\"s3:GetBucketLocation\",\"s3:GetObjectVersion\"],\"Resource\":[\"arn:aws:s3:::*/*\"]}]}" >> $CONFIG_LOCATION
echo "LOGGING_LEVEL=debug" >> $CONFIG_LOCATION

# Create and upload GreengrassIntegrationTestTemplate.json to S3
CDF_BUCKET_NAME="cdf-integration-tests-$aws_account_id"
CDF_TEMPLATE_FILE_NAME="GreengrassIntegrationTestTemplate.json"
# Check if bucket already created
EXISTS=$(aws s3api head-bucket --bucket $CDF_BUCKET_NAME 2>&1) || failed=1
if [ "$EXISTS" ]
then
    $(echo aws s3 mb s3://$CDF_BUCKET_NAME)
fi
$(echo aws s3 cp $(pwd)/source/packages/integration-tests/src/testResources/${CDF_TEMPLATE_FILE_NAME} s3://$CDF_BUCKET_NAME)
echo "GREENGRASS_TEMPLATE_S3_LOCATION=s3://$CDF_BUCKET_NAME/$CDF_TEMPLATE_FILE_NAME" >> $CONFIG_LOCATION

echo "PROVISIONING_TEMPLATES_BUCKET=$CDF_BUCKET_NAME" >> $CONFIG_LOCATION
echo "PROVISIONING_TEMPLATES_PREFIX=templates/" >> $CONFIG_LOCATION

echo "\naugmented configuration:\n$(cat $CONFIG_LOCATION)\n"

export APP_CONFIG_DIR="$(pwd)/source/packages/integration-tests/src/config"
export CONFIG_LOCATION=$CONFIG_LOCATION

echo running integration tests...

cd source/packages/integration-tests
npm config set @awssolutions/cdf-integration-tests:environment $ENVIRONMENT
npm run clean
npm run build
npm run integration-test -- "features/assetlibrary/full/*.feature"
npm run integration-test -- "features/assetlibraryhistory/*.feature"
npm run integration-test -- "features/bulkcerts/*.feature"
npm run integration-test -- "features/commands/*.feature"
npm run integration-test -- "features/commandandcontrol/*.feature"
npm run integration-test -- "features/device-patcher/*.feature"
npm run integration-test -- "features/greengrass2-provisioning/*.feature"
npm run integration-test -- "features/notifications/*.feature"
npm run integration-test -- "features/organizationmanager/*.feature"
npm run integration-test -- "features/provisioning/*.feature"
