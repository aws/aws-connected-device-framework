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
    Deploys the provisioning service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -o (string)   The OpenSSL lambda layer stack name.

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -k (string)   The KMS key ID used to encrypt SSM parameters.
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:o:c:k:b:N:C:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export PROVISIONING_CONFIG_LOCATION=$OPTARG;;

    k  ) export KMS_KEY_ID=$OPTARG;;
    o  ) export OPENSSL_STACK_NAME=$OPTARG;;
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

if [ -z "$PROVISIONING_CONFIG_LOCATION" ]; then
	echo -c PROVISIONING_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$OPENSSL_STACK_NAME" ]; then
  echo -o OPENSSL_STACK_NAME is required; help_message; exit 1;
fi

AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
OPENSSL_STACK_NAME=cdf-openssl-${ENVIRONMENT}


echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  PROVISIONING_CONFIG_LOCATION:     $PROVISIONING_CONFIG_LOCATION
  KMS_KEY_ID:                       $KMS_KEY_ID
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  OPENSSL_STACK_NAME:               $OPENSSL_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"

cwd=$(dirname "$0")

echo '
**********************************************************
  Determining OpenSSL lambda layer version
**********************************************************
'
stack_info=$(aws cloudformation describe-stacks --stack-name $OPENSSL_STACK_NAME $AWS_ARGS)
openssl_arn=$(echo $stack_info \
  | jq -r --arg stack_name "$OPENSSL_STACK_NAME" \
  '.Stacks[] | select(.StackName==$stack_name) | .Outputs[] | select(.OutputKey=="LayerVersionArn") | .OutputValue')

echo '
**********************************************************
  Deploying the Provisioning CloudFormation template 
**********************************************************
'
application_configuration_override=$(cat $PROVISIONING_CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-provisioning-output.yml \
  --stack-name $PROVISIONING_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      KmsKeyId=$KMS_KEY_ID \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
      OpenSslLambdaLayerArn=$openssl_arn \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS

if [ -n "$CUST_AUTH_STACK_NAME" ]; then
  echo '
  **********************************************************
    Updating Provisioning APIGateway Deployment
  **********************************************************
  '
  apigatewayResource=$(aws cloudformation describe-stack-resource --stack-name $PROVISIONING_STACK_NAME --logical-resource-id ApiGatewayApi $AWS_ARGS)
  restApiId=$(echo $apigatewayResource | jq -r '.StackResourceDetail.PhysicalResourceId')
  aws apigateway create-deployment --rest-api-id $restApiId --stage-name Prod $AWS_ARGS
fi


echo '
**********************************************************
  Done!
**********************************************************
'
