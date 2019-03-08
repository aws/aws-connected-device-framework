#!/usr/bin/env bash
if [ $# -lt 1 ]
then
  echo "Usage: $0 environment"
  exit 1
fi

ENVIRONMENT=$1
shift

CDF_NETWORK_STACK_NAME=network-${ENVIRONMENT}

echo "Using deployment stage ${ENVIRONMENT}"
aws cloudformation deploy \
 --template-file infrastructure/cfn-networking.yaml \
 --parameter-overrides \
        Environment=${ENVIRONMENT} \
 --stack-name ${CDF_NETWORK_STACK_NAME} \
--no-fail-on-empty-changeset \
 --capabilities CAPABILITY_IAM "$@"
 