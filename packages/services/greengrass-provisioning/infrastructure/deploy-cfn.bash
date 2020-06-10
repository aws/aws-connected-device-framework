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
    Deploys the Greengrass Provisioning service.

MANDATORY ARGUMENTS:
====================

    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.


OPTIONAL ARGUMENTS
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

    Autoscaling options:
    --------------------
    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaing.yml

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:v:g:n:i:a:y:z:C:A:x:s:R:P:" opt; do
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

    x  ) export CONCURRENT_EXECUTIONS=$OPTARG;;
    s  ) export APPLY_AUTOSCALING=true;;

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

CONCURRENT_EXECUTIONS="$(defaultIfNotSet 'CONCURRENT_EXECUTIONS' x ${CONCURRENT_EXECUTIONS} 0)"
APPLY_AUTOSCALING="$(defaultIfNotSet 'APPLY_AUTOSCALING' s ${APPLY_AUTOSCALING} false)"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )


if [ -z "$AWS_ACCOUNT_ID" ]; then
	AWS_ACCOUNT_ID=$(getAwsAccountId $AWS_ARGS)
fi

STACK_NAME=cdf-greengrass-provisioning-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}


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

  CONCURRENT_EXECUTIONS:            $CONCURRENT_EXECUTIONS
  APPLY_AUTOSCALING:                $APPLY_AUTOSCALING\

  AWS_ACCOUNT_ID:                   $AWS_ACCOUNT_ID
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"


cwd=$(dirname "$0")


logTitle 'Setting Greengrass Provisioning configuration'
aws_iot_endpoint=$(aws iot describe-endpoint  --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

provisioning_invoke_apifunctionname_export="$PROVISIONING_STACK_NAME-apifunctionname"
provisioning_invoke_apifunctionname=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_apifunctionname_export "$provisioning_invoke_apifunctionname_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_apifunctionname_export) | .Value')

cat $CONFIG_LOCATION | \
  jq --arg aws_iot_endpoint "$aws_iot_endpoint" \
  --arg provisioning_invoke_apifunctionname "$provisioning_invoke_apifunctionname" \
  --arg aws_account_id "$AWS_ACCOUNT_ID" \
  '.aws.iot.endpoint=$aws_iot_endpoint | .provisioning.apifunctionname=$provisioning_invoke_apifunctionname | .aws.accountId=$aws_account_id' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

application_configuration_override=$(cat $CONFIG_LOCATION)


logTitle 'Deploying the Greengrass Provisioning CloudFormation template '
aws cloudformation deploy \
  --template-file $cwd/build/cfn-greengrass-provisioning-output.yml \
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
      ProvisionedConcurrentExecutions=$CONCURRENT_EXECUTIONS \
      ApplyAutoscaling=$APPLY_AUTOSCALING \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


logTitle 'Updating greengrass bulk deployments policy'
# this has to be done manually, rather than cloudformation, as cloudformation
# is not capable of merging policies incase one already exists (which is highly likely)

# 1 : retrieve the bulk deployment role arn
stack_info=$(aws cloudformation describe-stacks --stack-name $STACK_NAME $AWS_ARGS)
bulk_deployments_role_arn=$(echo "$stack_info" \
  | jq -r --arg stack_name "$STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="BulkDeploymentsExecutionRoleArn") | .OutputValue')

# 2: retrieve the current policy.  default to a blank one if none set
bulk_deployments_bucket=$(cat "$CONFIG_LOCATION" | jq -r '.aws.s3.bulkdeployments.bucket' )
bucket_policy_response=$(aws s3api get-bucket-policy --bucket $bulk_deployments_bucket $AWS_ARGS || true)
if [ -z "$bucket_policy_response" ]; then
  bucket_policy_response='{"Policy": "{\"Version\": \"2012-10-17\",\"Statement\": []}"}'
fi
bucket_policies=$(echo "$bucket_policy_response" | jq -r '.Policy | fromjson')

bucket_policy=$(echo "$bucket_policies" \
  | jq --arg arn "$bulk_deployments_role_arn" \
  '.Statement[] | select(.Principal.AWS==$arn) ')

# 3 : determine if the policy already contains the bulk deployments role arn.  if not, add it
if [ -z "$bucket_policy" ]; then
  updated_policies=$(echo "$bucket_policies" \
    | jq --arg arn "$bulk_deployments_role_arn" \
    '.Statement[.Statement | length] |= . + {"Effect":"Allow", "Principal":{"AWS":[$arn]}, "Action":"s3:GetObject", "Resource":"arn:aws:s3:::'$bulk_deployments_bucket'/*"}')
  aws s3api put-bucket-policy --bucket $bulk_deployments_bucket --policy "$updated_policies" $AWS_ARGS
fi

   
logTitle 'Greengrass Provisioning deployment complete!'
