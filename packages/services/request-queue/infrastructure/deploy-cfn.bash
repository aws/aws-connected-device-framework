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
    Deploys the CDF Request Queue Service

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -L (string)   ARN of Primary region's API Lambda function - events will be replayed to this Lambda
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.


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

    Misc:
    -----
    -S (string)   What to name this stack.  Defaults to cdf-request-queue-${ENVIRONMENT}.
    -p (string)   Should replay Lambda be setup to automatically poll replay queue?

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.


EOF
}

while getopts ":e:c:L:v:g:n:i:a:y:z:C:A:S:pR:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    L  ) export PRIMARY_LAMBDA_ARN=$OPTARG;;

    S  ) export REQUESTQUEUE_STACK_NAME=$OPTARG;;
    p  ) export REQUESTQUEUE_AUTO_POLL=ENABLED;;

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
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e ${ENVIRONMENT})))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CONFIG_LOCATION c "$CONFIG_LOCATION")))

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType ${API_GATEWAY_AUTH})))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIMARY_LAMBDA_ARN c ${PRIMARY_LAMBDA_ARN})))

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

REQUESTQUEUE_STACK_NAME="$(defaultIfNotSet 'REQUESTQUEUE_STACK_NAME' S ${REQUESTQUEUE_STACK_NAME} cdf-request-queue-${ENVIRONMENT})"
REQUESTQUEUE_AUTO_POLL="$(defaultIfNotSet 'REQUESTQUEUE_AUTO_POLL' P ${REQUESTQUEUE_AUTO_POLL} 'DISABLED')"



echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  REQUESTQUEUE_STACK_NAME:          $REQUESTQUEUE_STACK_NAME
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  PRIMARY_LAMBDA_ARN:               $PRIMARY_LAMBDA_ARN
  REQUESTQUEUE_AUTO_POLL:           $REQUESTQUEUE_AUTO_POLL

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

logTitle 'Deploying the CDF Request Queue CloudFormation template'
application_configuration_override=$(cat $CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-request-queue-output.yml \
  --stack-name $REQUESTQUEUE_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      PrimaryLambdaArn=$PRIMARY_LAMBDA_ARN \
      ReplayPollingEnabled=$REQUESTQUEUE_AUTO_POLL \
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
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Request Queue deployment complete!'