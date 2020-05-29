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
    Deploys the CDF Greengrass Deployment service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -S (string)   What to name this stack.  Defaults to cdf-greengrass-deployment-${ENVIRONMENT}.

    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:C:S:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;

    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;
    S  ) export STACK_NAME=$OPTARG;;

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

AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi

if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

if [ -z "$STACK_NAME" ]; then
  STACK_NAME=cdf-greengrass-deployment-${ENVIRONMENT}
fi

GREENGRASS_PROVISIONING_STACK_NAME=cdf-greengrass-provisioning-${ENVIRONMENT}

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

DEPLOYMENT_LOGS_BUCKET=$(cat $CONFIG_LOCATION | jq -r '.aws.s3.deploymentLogs.bucket')

echo '
**********************************************************
  Deploying Greengrass Deployment template
**********************************************************
'
application_configuration_override=$(cat $CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-greengrass-deployment-output.yml \
  --stack-name $STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
      GreengrassProvisioningStackName=$GREENGRASS_PROVISIONING_STACK_NAME \
      DeploymentLogsBucketName=$DEPLOYMENT_LOGS_BUCKET \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

if [ -n "$CUST_AUTH_STACK_NAME" ]; then
  echo '
  **********************************************************
    Updating Greengrass Deployment APIGateway Deployment
  **********************************************************
  '
  apigatewayResource=$(aws cloudformation describe-stack-resource --stack-name $STACK_NAME --logical-resource-id ApiGatewayApi $AWS_ARGS)
  restApiId=$(echo $apigatewayResource | jq -r '.StackResourceDetail.PhysicalResourceId')
  aws apigateway create-deployment --rest-api-id $restApiId --stage-name Prod $AWS_ARGS
fi


echo '
**********************************************************
  Greengrass Deployment Done!
**********************************************************
'
