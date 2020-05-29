#!/bin/bash
set -e

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
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS
    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaing.yml  

    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:x:sC:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

    x  ) export CONCURRENT_EXECUTIONS=$OPTARG;;
    s  ) export APPLY_AUTOSCALING=true;;

    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;

    R  ) export AWS_REGION=$OPTARG;;
    P  ) export AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


if [ -z "$ENVIRONMENT" ]; then
	echo -e ENVIRONMENT is required; help_message; exit 1;
fi

if [ -z "$CONFIG_LOCATION" ]; then
	echo -c CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$CONCURRENT_EXECUTIONS" ]; then
	export CONCURRENT_EXECUTIONS=0
fi

if [ -z "$APPLY_AUTOSCALING" ]; then
	export APPLY_AUTOSCALING=false
fi


AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


if [ -z "$AWS_ACCOUNT_ID" ]; then
	AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)
fi

STACK_NAME=cdf-greengrass-provisioning-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  CONCURRENT_EXECUTIONS:            $CONCURRENT_EXECUTIONS
  APPLY_AUTOSCALING:                $APPLY_AUTOSCALING
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_ACCOUNT_ID:                   $AWS_ACCOUNT_ID
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"


cwd=$(dirname "$0")


echo '
**********************************************************
  Setting Greengrass Provisioning configuration
**********************************************************
'
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


echo '
**********************************************************
  Deploying the Greengrass Provisioning CloudFormation template 
**********************************************************
'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-greengrass-provisioning-output.yml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
      ProvisionedConcurrentExecutions=$CONCURRENT_EXECUTIONS \
      ApplyAutoscaling=$APPLY_AUTOSCALING \
  --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

if [ -n "$CUST_AUTH_STACK_NAME" ]; then
  echo '
  **********************************************************
    Updating Greengrass Provisioning APIGateway Deployment
  **********************************************************
  '
  apigatewayResource=$(aws cloudformation describe-stack-resource --stack-name $STACK_NAME --logical-resource-id ApiGatewayApi $AWS_ARGS)
  restApiId=$(echo $apigatewayResource | jq -r '.StackResourceDetail.PhysicalResourceId')
  aws apigateway create-deployment --rest-api-id $restApiId --stage-name Prod $AWS_ARGS
fi



echo '
**********************************************************
  Updating greengrass bulk deployments policy
**********************************************************
'
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

   
echo '
**********************************************************
  Greengrass Provisioning Done!
**********************************************************
'
