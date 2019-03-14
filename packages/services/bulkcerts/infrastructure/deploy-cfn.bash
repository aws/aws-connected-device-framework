#!/bin/bash
set -e

#-------------------------------------------------------------------------------
# Copyright (c) 2018 Amazon.com, Inc. or its affiliates. All Rights Reserved.
# 
# This source code is subject to the terms found in the AWS Enterprise Customer Agreement.
#-------------------------------------------------------------------------------

function help_message {
    cat << EOF

NAME
    deploy-cfn.bash    

DESCRIPTION
    Deploys the Bulk Certs service.

MANDATORY ARGUMENTS:
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -k (string)   The KMS key ID used to encrypt SSM parameters.

OPTIONAL ARGUMENTS
    -C (string)   Name of customer authorizer stack.  Defaults to cdf-custom-auth-${ENVIRONMENT}.
    -Q (string)   Name of provisioning stack.  Defaults to cdf-provisioning-${ENVIRONMENT}.
    -S (string)   What to name this stack.  Defaults to cdf-bulkcerts-${ENVIRONMENT}.
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

while getopts ":e:c:k:N:Q:C:S:R:P:" opt; do
  case $opt in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export BULKCERTS_CONFIG_LOCATION=$OPTARG;;
    k  ) export KMS_KEY_ID=$OPTARG;;

    Q  ) export PROVISIONING_STACK_NAME=$OPTARG;;
    C  ) export CUST_AUTH_STACK_NAME=$OPTARG;;
    S  ) export BULKCERTS_STACK_NAME=$OPTARG;;

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

if [ -z "$BULKCERTS_CONFIG_LOCATION" ]; then
	echo -c BULKCERTS_CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -z "$KMS_KEY_ID" ]; then
	echo -k KMS_KEY_ID is required; help_message; exit 1;
fi



AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi


if [ -z "$CUST_AUTH_STACK_NAME" ]; then
  CUST_AUTH_STACK_NAME=cdf-custom-auth-${ENVIRONMENT}
fi
if [ -z "$PROVISIONING_STACK_NAME" ]; then
  PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
fi
if [ -z "$BULKCERTS_STACK_NAME" ]; then
  BULKCERTS_STACK_NAME=cdf-bulkcerts-${ENVIRONMENT}
fi




echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  BULKCERTS_STACK_NAME:             $BULKCERTS_STACK_NAME
  PROVISIONING_STACK_NAME:          $PROVISIONING_STACK_NAME
  BULKCERTS_CONFIG_LOCATION:        $BULKCERTS_CONFIG_LOCATION
  KMS_KEY_ID:                       $KMS_KEY_ID
  CUST_AUTH_STACK_NAME:             $CUST_AUTH_STACK_NAME
  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"
cwd=$(dirname "$0")

echo '
**********************************************************
*****  Bulk Certs Identifying deployed endpoints ******
**********************************************************
'
stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

provisioning_invoke_url_export="$PROVISIONING_STACK_NAME-apigatewayurl"
provisioning_invoke_url=$(echo $stack_exports \
    | jq -r --arg provisioning_invoke_url_export "$provisioning_invoke_url_export" \
    '.Exports[] | select(.Name==$provisioning_invoke_url_export) | .Value')


echo '
**********************************************************
*****  Setting Bulk Certs configuration          ******
**********************************************************
'
bulk_certs_request_topic_export="$PROVISIONING_STACK_NAME-BulkCertificatesRequestSnsTopic"
bulk_certs_request_topic=$(echo $stack_exports \
    | jq -r --arg bulk_certs_request_topic_export "$bulk_certs_request_topic_export" \
    '.Exports[] | select(.Name==$bulk_certs_request_topic_export) | .Value')

cat $BULKCERTS_CONFIG_LOCATION | \
  jq --arg provisioning_invoke_url "$provisioning_invoke_url" --arg bulk_certs_request_topic "$bulk_certs_request_topic" \
  '.provisioning.baseUrl=$provisioning_invoke_url | .events.request.topic=$bulk_certs_request_topic' \
  > $BULKCERTS_CONFIG_LOCATION.tmp && mv $BULKCERTS_CONFIG_LOCATION.tmp $BULKCERTS_CONFIG_LOCATION



echo '
**********************************************************
  Deploying the Bulk Certs CloudFormation template
**********************************************************
'
application_configuration_override=$(cat $BULKCERTS_CONFIG_LOCATION)

aws cloudformation deploy \
  --template-file $cwd/build/cfn-bulkcerts-output.yml \
  --stack-name $BULKCERTS_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      KmsKeyId=$KMS_KEY_ID \
      CustAuthStackName=$CUST_AUTH_STACK_NAME \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  $AWS_ARGS


echo '
**********************************************************
  Done!
**********************************************************
'