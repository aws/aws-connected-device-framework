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
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi
source ../../../infrastructure/common-deploy-functions.bash

function help_message {
    cat << EOF

NAME
    deploy-cfn.bash    

DESCRIPTION
    Deploys the asset library.

MANDATORY ARGUMENTS:
====================
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

    -m (string)   Mode ('full' or 'lite').  Defaults to full.
    -l (string)   Custom Resource Lambda Arn

OPTIONAL ARGUMENTS:
===================
    -f (string)   Enable API Gateway Access Logs
    -a (string)   API Gateway authorization type. Must be from the following list (default is None):
                  - None
                  - Private
                  - Cognito
                  - LambdaRequest
                  - LambdaToken
                  - ApiKey
                  - IAM
    -u (string)   The Neptune DB Instance type. Must be from the following list (default is db.r4.xlarge):
                  - db.t3.medium
                  - db.r4.large
                  - db.r4.xlarge
                  - db.r4.2xlarge
                  - db.r4.4xlarge
                  - db.r4.8xlarge

    Required if deploying in full mode, or private api auth:
    --------------------------------------------------------
    -v (string)   ID of VPC to deploy into
    -g (string)   ID of CDF security group
    -n (string)   ID of private subnets (comma delimited) to deploy into
    -r (string)   ID of private routetables (comma delimited) to configure for Neptune access

    Required for private api auth:
    ------------------------------
    -i (string)   ID of VPC execute-api endpoint

    Required for Cognito auth:
    --------------------------
    -C (string)   Cognito user pool arn

    Required for LambdaRequest / LambdaToken auth:
    ---------------------------------------------
    -A (string)   Lambda authorizer function arn.

    Required for autoscaling:
    -------------------------
    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaing.yml  

    Required if restoring the Asset Library database from a previous backup:
    ------------------------------------------------------------------------
    -D (string)  Snapshot ID to restore from. Note: once restored from a backup, the same snapshot identifier must be specified for all future deployments too.

    Required if Enhanced Search is enabled
    -------------------------------------
    -k (string)   The KMS key ID used to encrypt the ElasticSearch database

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

#-------------------------------------------------------------------------------
# Validate all arguments
#-------------------------------------------------------------------------------

while getopts ":e:c:v:g:n:m:y:z:l:C:A:i:r:x:u:sfD:k:a:R:P" opt; do
  case ${opt} in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    r  ) export PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;
    i  ) export PRIVATE_ENDPOINT_ID=$OPTARG;;
    u  ) export NEPTUNE_DB_INSTANCE_TYPE=$OPTARG;;

    m  ) export ASSETLIBRARY_MODE=$OPTARG;;

    a  ) export API_GATEWAY_AUTH=$OPTARG;;
    y  ) export TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;
    z  ) export API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    C  ) export COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) export AUTHORIZER_FUNCTION_ARN=$OPTARG;;

    x  ) export CONCURRENT_EXECUTIONS=$OPTARG;;
    s  ) export APPLY_AUTOSCALING=true;;
    f  ) export ENABLE_API_GATEWAY_ACCESS_LOGS=true;;
    l  ) export CUSTOM_RESOURCE_LAMBDA_ARN=$OPTARG;;

    D  ) export ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


incorrect_args=0
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CONFIG_LOCATION c "$CONFIG_LOCATION")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CUSTOM_RESROUCE_LAMBDA_ARN l "$CUSTOM_RESOURCE_LAMBDA_ARN")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType $API_GATEWAY_AUTH)))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

ASSETLIBRARY_MODE="$(defaultIfNotSet 'ASSETLIBRARY_MODE' m ${ASSETLIBRARY_MODE} 'full')"
valid_modes=( lite full enhanced )
incorrect_args=$((incorrect_args+$(verifyListContainsArgument ASSETLIBRARY_MODE m "$ASSETLIBRARY_MODE" "${valid_modes[@]}")))
if [[ "$ASSETLIBRARY_MODE" = "full" ]] || [[ "$ASSETLIBRARY_MODE" = "enhanced" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument VPC_ID v "$VPC_ID")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CDF_SECURITY_GROUP_ID g "$CDF_SECURITY_GROUP_ID")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIVATE_SUBNET_IDS n "$PRIVATE_SUBNET_IDS")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIVATE_ROUTE_TABLE_IDS r "$PRIVATE_ROUTE_TABLE_IDS")))
fi
if [[ "$ASSETLIBRARY_MODE" = "enhanced" ]]; then
  incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k "$KMS_KEY_ID")))
fi 

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"
CONCURRENT_EXECUTIONS="$(defaultIfNotSet 'CONCURRENT_EXECUTIONS' x ${CONCURRENT_EXECUTIONS} 0)"
APPLY_AUTOSCALING="$(defaultIfNotSet 'APPLY_AUTOSCALING' s ${APPLY_AUTOSCALING} false)"
ENABLE_API_GATEWAY_ACCESS_LOGS="$(defaultIfNotSet 'ENABLE_API_GATEWAY_ACCESS_LOGS' f ${ENABLE_API_GATEWAY_ACCESS_LOGS} false)"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}
ENHANCEDSEARCH_STACK_NAME=cdf-assetlibrary-elasticsearch-${ENVIRONMENT}
ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
BASTION_STACK_NAME=cdf-bastion-${ENVIRONMENT}


#-------------------------------------------------------------------------------
# All arguments are good, so inform the user what is configured...
#-------------------------------------------------------------------------------

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  ASSETLIBRARY_MODE:                $ASSETLIBRARY_MODE
  ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER: $ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER
  NEPTUNE_DB_INSTANCE_TYPE:         $NEPTUNE_DB_INSTANCE_TYPE

  TEMPLATE_SNIPPET_S3_URI_BASE:     $TEMPLATE_SNIPPET_S3_URI_BASE
  API_GATEWAY_DEFINITION_TEMPLATE:  $API_GATEWAY_DEFINITION_TEMPLATE

  API_GATEWAY_AUTH:                 $API_GATEWAY_AUTH
  COGNTIO_USER_POOL_ARN:            $COGNTIO_USER_POOL_ARN
  AUTHORIZER_FUNCTION_ARN:          $AUTHORIZER_FUNCTION_ARN

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS
  PRIVATE_ROUTE_TABLE_IDS:          $PRIVATE_ROUTE_TABLE_IDS
  PRIVATE_ENDPOINT_ID:              $PRIVATE_ENDPOINT_ID

  CONCURRENT_EXECUTIONS:            $CONCURRENT_EXECUTIONS
  APPLY_AUTOSCALING:                $APPLY_AUTOSCALING

  KMS_KEY_ID:                       $KMS_KEY_ID

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"


cwd=$(dirname "$0")

case "$ASSETLIBRARY_MODE" in
  "enhanced"  ) DEPLOY_NEPTUNE=1 NEPTUNE_ENABLE_STREAMS=1 DEPLOY_OPENSEARCH=1 ;;
  "full"      ) DEPLOY_NEPTUNE=1 NEPTUNE_ENABLE_STREAMS=0 DEPLOY_OPENSEARCH=0 ;;
  "lite"      ) DEPLOY_NEPTUNE=0 NEPTUNE_ENABLE_STREAMS=0 DEPLOY_OPENSEARCH=0 ;;
esac

if [[ $DEPLOY_NEPTUNE = 1 ]]; then

  logTitle 'Deploying the Neptune CloudFormation template'

  neptune_instance_type=
  if [ -n "$NEPTUNE_DB_INSTANCE_TYPE" ]; then
      neptune_instance_type="DbInstanceType=$NEPTUNE_DB_INSTANCE_TYPE"
  fi

  # clear any pre-existing stack policies as these are now handled by deletion/update policies within cloudformation
  aws cloudformation set-stack-policy \
    --stack-name $NEPTUNE_STACK_NAME \
    --stack-policy-body "{\"Statement\":[{\"Effect\":\"Allow\",\"Action\":\"Update:*\",\"Principal\":\"*\",\"Resource\":\"*\"}]}" \
    $AWS_ARGS || true

  aws cloudformation deploy \
    --template-file $cwd/cfn-neptune.yaml \
    --stack-name $NEPTUNE_STACK_NAME \
    --parameter-overrides \
        VpcId=$VPC_ID \
        CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
        PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
        PrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS \
        CustomResourceVPCLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
        SnapshotIdentifier=$ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER \
        NeptuneEnableStreams=$NEPTUNE_ENABLE_STREAMS \
        $neptune_instance_type \
        Environment=$ENVIRONMENT \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset \
    $AWS_ARGS

  cfn_exports_1=$(aws cloudformation list-exports $AWS_ARGS)

  neptune_url_export="$NEPTUNE_STACK_NAME-GremlinEndpoint"
  neptune_url=$(echo $cfn_exports_1 \
      | jq -r --arg neptune_url_export "$neptune_url_export" \
      '.Exports[] | select(.Name==$neptune_url_export) | .Value')

  neptune_sg_export="$NEPTUNE_STACK_NAME-NeptuneSecurityGroupID"
  neptune_sg=$(echo $cfn_exports_1 \
      | jq -r --arg neptune_sg_export "$neptune_sg_export" \
      '.Exports[] | select(.Name==$neptune_sg_export) | .Value')

  neptune_cluster_endpoint_export="$NEPTUNE_STACK_NAME-DBClusterReadEndpoint"
  neptune_cluster_endpoint=$(echo $cfn_exports_1 \
      | jq -r --arg neptune_cluster_endpoint_export "$neptune_cluster_endpoint_export" \
      '.Exports[] | select(.Name==$neptune_cluster_endpoint_export) | .Value')

  if [[ $DEPLOY_OPENSEARCH = 1 ]]; then
  
    logTitle 'Deploying the Enhanced Search CloudFormation template'

    aws cloudformation deploy \
      --template-file $cwd/cfn-enhancedsearch.yaml \
      --stack-name $ENHANCEDSEARCH_STACK_NAME \
      --parameter-overrides \
          VpcId=$VPC_ID \
          CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
          PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
          PrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS \
          CustomResourceVPCLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
          KmsKeyId=$KMS_KEY_ID \
          NeptuneSecurityGroupId=$neptune_sg \
          NeptuneClusterEndpoint=$neptune_cluster_endpoint \
          Environment=$ENVIRONMENT \
      --capabilities CAPABILITY_NAMED_IAM \
      --no-fail-on-empty-changeset \
      $AWS_ARGS 
  
  fi

fi

logTitle 'Setting Asset Library configuration'

aws_iot_endpoint=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

cat $CONFIG_LOCATION | \
  jq --arg mode "$ASSETLIBRARY_MODE" --arg aws_iot_endpoint "$aws_iot_endpoint" \
  '.mode=$mode | .aws.iot.endpoint=$aws_iot_endpoint' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

if [[ $DEPLOY_NEPTUNE = 1 ]]; then

  cat $CONFIG_LOCATION | \
    jq --arg neptune_url "$neptune_url" \
    '.aws.neptune.url=$neptune_url' \
    > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

  if [[ $DEPLOY_OPENSEARCH = 1 ]]; then

    # refresh CloudFormation exports to include those created by cfn-enhancedsearch stack
    cfn_exports_2=$(aws cloudformation list-exports $AWS_ARGS)

    opensearch_url_export="$ENHANCEDSEARCH_STACK_NAME-OpenSearchDomainEndpoint"
    opensearch_url=$(echo $cfn_exports_2 \
      | jq -r --arg opensearch_url_export "$opensearch_url_export" \
      '.Exports[] | select(.Name==$opensearch_url_export) | .Value')

    cat $CONFIG_LOCATION | \
      jq --arg opensearch_url "$opensearch_url" \
      '.aws.neptune.openSearchEndpoint=$opensearch_url' \
      > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

  fi 

fi

application_configuration_override=$(cat $CONFIG_LOCATION)

echo "
Using configuration:
$application_configuration_override
"

logTitle 'Deploying the Asset Library CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-assetLibrary-output.yaml \
  --stack-name $ASSETLIBRARY_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      VpcId=$VPC_ID \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
      PrivateApiGatewayVPCEndpoint=$PRIVATE_ENDPOINT_ID \
      Mode=$ASSETLIBRARY_MODE \
      TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE \
      ApiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE \
      CognitoUserPoolArn=$COGNTIO_USER_POOL_ARN \
      AuthorizerFunctionArn=$AUTHORIZER_FUNCTION_ARN \
      AuthType=$API_GATEWAY_AUTH \
      ProvisionedConcurrentExecutions=$CONCURRENT_EXECUTIONS \
      ApplyAutoscaling=$APPLY_AUTOSCALING \
      NeptuneURL=$neptune_url \
      CustomResourceVPCLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
      EnableApiGatewayAccessLogs=$ENABLE_API_GATEWAY_ACCESS_LOGS \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

logTitle 'Asset Library deployment complete!'
