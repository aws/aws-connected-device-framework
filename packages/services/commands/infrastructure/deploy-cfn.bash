#!/bin/bash
set -e
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi
source ../../../infrastructure/common-deploy-functions.bash


#-------------------------------------------------------------------------------
# Copyright (c) 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------

function help_message {
    cat << EOF

NAME
    deploy-cfn.bash    

DESCRIPTION
    Deploys the commands service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

    -f (string)   Name of bucket where command files are to be stored.


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

while getopts ":e:c:f:v:g:n:i:a:y:z:C:A:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    f  ) export BUCKET=$OPTARG;;

    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    i  ) export PRIVATE_ENDPOINT_ID=$OPTARG;;

    a  ) export API_GATEWAY_AUTH=$OPTARG;;
    y  ) export TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;
    z  ) export API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    C  ) export COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) export AUTHORIZER_FUNCTION_ARN=$OPTARG;;

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

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType $API_GATEWAY_AUTH)))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument BUCKET f "$BUCKET")))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
COMMANDS_PRE_STACK_NAME=cdf-commands-pre-${ENVIRONMENT}
COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  BUCKET:                           $BUCKET

  TEMPLATE_SNIPPET_S3_URI_BASE:     $TEMPLATE_SNIPPET_S3_URI_BASE
  API_GATEWAY_DEFINITION_TEMPLATE:  $API_GATEWAY_DEFINITION_TEMPLATE

  API_GATEWAY_AUTH:                 $API_GATEWAY_AUTH
  COGNTIO_USER_POOL_ARN:            $COGNTIO_USER_POOL_ARN
  AUTHORIZER_FUNCTION_ARN:          $AUTHORIZER_FUNCTION_ARN

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS
  PRIVATE_ENDPOINT_ID:              $PRIVATE_ENDPOINT_ID

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")


logTitle 'Enabling IoT job lifecycle events'
aws iot update-event-configurations --cli-input-json \
'{
    "eventConfigurations": {
        "JOB": {
            "Enabled": true
        }
    }
}' $AWS_ARGS


logTitle 'Setting Commands configuration'
aws_iot_endpoint=$(aws iot describe-endpoint --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

provisioning_invoke_export="$PROVISIONING_STACK_NAME-restApiFunctionName"
provisioning_invoke=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_export "$provisioning_invoke_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_export) | .Value')

assetlibrary_invoke_export="$ASSETLIBRARY_STACK_NAME-restApiFunctionName"
assetlibrary_invoke=$(echo $stack_exports \
    | jq -r --arg assetlibrary_invoke_export "$assetlibrary_invoke_export" \
    '.Exports[] | select(.Name==$assetlibrary_invoke_export) | .Value')

cat $CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint" --arg assetlibrary_invoke "$assetlibrary_invoke" --arg provisioning_invoke "$provisioning_invoke" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .assetLibrary.apiFunctionName=$assetlibrary_invoke | .provisioning.apiFunctionName=$provisioning_invoke' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)


logTitle 'Deploying the Commands CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-commands-output.yml \
  --stack-name $COMMANDS_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      BucketName=$BUCKET \
      VpcId=$VPC_ID \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
      PrivateApiGatewayVPCEndpoint=$PRIVATE_ENDPOINT_ID \
      TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE \
      ApiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE \
      CognitoUserPoolArn=$COGNTIO_USER_POOL_ARN \
      AuthorizerFunctionArn=$AUTHORIZER_FUNCTION_ARN \
      AuthType=$API_GATEWAY_AUTH \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Commands deployment complete!'