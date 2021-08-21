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
    Deploys the Events Processor service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.
    -l (string)   Custom Resource Lambda Arn
    -k (string)   The KMS key ID used to encrypt SSM parameters.

OPTIONAL ARGUMENTS:
===================

    -a (string)   API Gateway authorization type. Must be from the following list (default is None):
                  - None
                  - Private
                  - Cognito
                  - LambdaRequest
                  - LambdaToken
                  - ApiKey
                  - IAM

    Required for private api auth:
    --------------------------------------------------------
    -v (string)   ID of VPC to deploy into
    -g (string)   ID of CDF security group
    -n (string)   ID of private subnets (comma delimited) to deploy into
    -i (string)   ID of VPC execute-api endpoint

    Required for Cognito auth:
    --------------------------
    -C (string)   Cognito user pool arn

    Required for LambdaRequest / LambdaToken auth:
    ---------------------------------------------
    -A (string)   Lambda authorizer function arn.

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.

EOF
}

while getopts ":e:c:v:g:n:i:a:y:z:C:A:l:k:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    i  ) export PRIVATE_ENDPOINT_ID=$OPTARG;;

    a  ) export API_GATEWAY_AUTH=$OPTARG;;
    y  ) export TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;
    z  ) export API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    C  ) export COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) export AUTHORIZER_FUNCTION_ARN=$OPTARG;;
    l  ) export CUSTOM_RESOURCE_LAMBDA_ARN=$OPTARG;;
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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument KMS_KEY_ID k "$KMS_KEY_ID")))


DEFAULT_SUBNETS="$(defaultIfNotSet 'DEFAULT_SUBNETS' S ${DEFAULT_SUBNETS} 'true')"

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType $API_GATEWAY_AUTH)))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

if [ -z "$AWS_ACCOUNT_ID" ]; then
	AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)
fi


STACK_NAME=cdf-eventsProcessor-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION

  TEMPLATE_SNIPPET_S3_URI_BASE:     $TEMPLATE_SNIPPET_S3_URI_BASE
  API_GATEWAY_DEFINITION_TEMPLATE:  $API_GATEWAY_DEFINITION_TEMPLATE

  API_GATEWAY_AUTH:                 $API_GATEWAY_AUTH
  COGNTIO_USER_POOL_ARN:            $COGNTIO_USER_POOL_ARN
  AUTHORIZER_FUNCTION_ARN:          $AUTHORIZER_FUNCTION_ARN

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS
  PRIVATE_ENDPOINT_ID:              $PRIVATE_ENDPOINT_ID

  AWS_ACCOUNT_ID:                   $AWS_ACCOUNT_ID
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


logTitle 'Setting Event Processor configuration'
aws_iot_endpoint=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

cat $CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint" --arg aws_account_id "$AWS_ACCOUNT_ID" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .aws.accountId=$aws_account_id' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)


logTitle 'Deploying the Event Processor CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-eventsProcessor-output.yml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      VpcId=$VPC_ID \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
      PrivateApiGatewayVPCEndpoint=$PRIVATE_ENDPOINT_ID \
      TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE \
      ApiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE \
      CognitoUserPoolArn=$COGNTIO_USER_POOL_ARN \
      AuthorizerFunctionArn=$AUTHORIZER_FUNCTION_ARN \
      AuthType=$API_GATEWAY_AUTH \
      CustomResourceLambdaArn=$CUSTOM_RESOURCE_LAMBDA_ARN \
      KmsKeyId=$KMS_KEY_ID \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Event Processor deployment complete!'
