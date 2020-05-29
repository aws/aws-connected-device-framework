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
    Deploys the CDF Request Queue Service

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -L (string)   ARN of Primary region's API Lambda function - events will be replayed to this Lambda

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -S (string)   What to name this stack.  Defaults to cdf-request-queue-${ENVIRONMENT}.
    -p (string)   Should replay Lambda be setup to automatically poll replay queue?
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:L:C:S:pR:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export REQUESTQUEUE_CONFIG_LOCATION=$OPTARG;;
    L  ) export PRIMARY_LAMBDA_ARN=$OPTARG;;

    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;
    S  ) export REQUESTQUEUE_STACK_NAME=$OPTARG;;
    p  ) export REQUESTQUEUE_AUTO_POLL=ENABLED;;

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

if [ -z "$REQUESTQUEUE_CONFIG_LOCATION" ]; then
	echo -c REQUESTQUEUE_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$PRIMARY_LAMBDA_ARN" ]; then
	echo -c PRIMARY_LAMBDA_ARN is required; help_message; exit 1;
fi

AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

if [ -z "$REQUESTQUEUE_STACK_NAME" ]; then
  REQUESTQUEUE_STACK_NAME=cdf-request-queue-${ENVIRONMENT}
fi

if [ -z "$REQUESTQUEUE_AUTO_POLL" ]; then
  REQUESTQUEUE_AUTO_POLL=DISABLED
fi



echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  REQUESTQUEUE_STACK_NAME:          $REQUESTQUEUE_STACK_NAME
  REQUESTQUEUE_CONFIG_LOCATION:     $REQUESTQUEUE_CONFIG_LOCATION
  PRIMARY_LAMBDA_ARN:               $PRIMARY_LAMBDA_ARN
  REQUESTQUEUE_AUTO_POLL:           $REQUESTQUEUE_AUTO_POLL
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

echo '
**********************************************************
  Deploying the CDF Request Queue CloudFormation template 
**********************************************************
'
application_configuration_override=$(cat $REQUESTQUEUE_CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-request-queue-output.yml \
  --stack-name $REQUESTQUEUE_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      PrimaryLambdaArn=$PRIMARY_LAMBDA_ARN \
      ReplayPollingEnabled=$REQUESTQUEUE_AUTO_POLL \
      ApplicationConfigurationOverride="$application_configuration_override" \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

if [ -n "$CUST_AUTH_STACK_NAME" ]; then
  echo '
  **********************************************************
    Updating the Request Queue APIGateway Deployment
  **********************************************************
  '
  apigatewayResource=$(aws cloudformation describe-stack-resource --stack-name $REQUESTQUEUE_STACK_NAME --logical-resource-id ApiGatewayApi $AWS_ARGS)
  restApiId=$(echo $apigatewayResource | jq -r '.StackResourceDetail.PhysicalResourceId')
  aws apigateway create-deployment --rest-api-id $restApiId --stage-name Prod $AWS_ARGS
fi


echo '
**********************************************************
  Done!
**********************************************************
'
