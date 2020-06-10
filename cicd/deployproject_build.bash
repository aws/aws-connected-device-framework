#!/bin/bash

set -e

echo deployproject_build started on `date`

# regardless of which environment we're deploying to, staging/live always use the same application config (but
# note that each service's own installation scripts automatically updates environment specific urls)
CONFIG_ENVIRONMENT=${ENVIRONMENT%-staging}

cmd="infrastructure/deploy-core.bash \
  -e $ENVIRONMENT \
  -E $CONFIG_ENVIRONMENT \
  -c \"$CODEBUILD_SRC_DIR_source_infrastructure\" \
  -BY"

if [ -n "$KEY_PAIR_NAME" ]; then
    cmd+=" -p $KEY_PAIR_NAME"
fi

if [ -n "$BASTION_REMOTE_ACCESS_CIDR" ]; then
    cmd+=" -i $BASTION_REMOTE_ACCESS_CIDR"
fi

if [ -n "$DEPLOY_ARTIFACTS_STORE_BUCKET" ]; then
    cmd+=" -b $DEPLOY_ARTIFACTS_STORE_BUCKET"
fi

if [ -n "$KMS_KEY_ID" ]; then
    cmd+=" -k $KMS_KEY_ID"
fi

if [ -n "$API_GATEWAY_AUTH" ]; then
    cmd+=" -a $API_GATEWAY_AUTH"
fi

if [ -n "$TEMPLATE_SNIPPET_S3_URI_BASE" ]; then
    cmd+=" -y $TEMPLATE_SNIPPET_S3_URI_BASE"
fi

if [ -n "$API_GATEWAY_DEFINITION_TEMPLATE" ]; then
    cmd+=" -z $API_GATEWAY_DEFINITION_TEMPLATE"
fi

if [ -n "$COGNTIO_USER_POOL_ARN" ]; then
    cmd+=" -c $COGNTIO_USER_POOL_ARN"
fi

if [ -n "$AUTHORIZER_FUNCTION_ARN" ]; then
    cmd+=" -A $AUTHORIZER_FUNCTION_ARN"
fi


if [ -n "$ASSETLIBRARY_MODE" ]; then
    cmd+=" -m $ASSETLIBRARY_MODE"
fi

if [ -n "$USE_EXISTING_VPC" ]; then
    cmd+=" -N"
fi

if [ -n "$VPC_ID" ]; then
    cmd+=" -v $VPC_ID"
fi

if [ -n "$SOURCE_SECURITY_GROUP_ID" ]; then
    cmd+=" -g $SOURCE_SECURITY_GROUP_ID"
fi

if [ -n "$PRIVATE_SUBNET_IDS" ]; then
    cmd+=" -n $PRIVATE_SUBNET_IDS"
fi

if [ -n "$PUBLIC_SUBNET_IDS" ]; then
    cmd+=" -o $PUBLIC_SUBNET_IDS"
fi

if [ -n "$PRIVATE_ROUTE_TABLE_IDS" ]; then
    cmd+=" -r $PRIVATE_ROUTE_TABLE_IDS"
fi

echo Running deploy command $cmd
eval $cmd