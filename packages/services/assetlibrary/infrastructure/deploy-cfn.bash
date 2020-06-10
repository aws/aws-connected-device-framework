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
    Deploys the asset library.

MANDATORY ARGUMENTS:
====================
    -e (string)   Name of environment.
    -c (string)   Location of application configuration file containing configuration overrides.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

    -m (string)   Mode ('full' or 'lite').  Defaults to full.

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

    Required if deploying in full mode, or private api auth:
    --------------------------------------------------------
    -v (string)   ID of VPC to deploy into
    -g (string)   ID of CDF security group
    -n (string)   ID of private subnets (comma delimited) to deploy into
    -r (string)   ID of private routetables (comma delimited) to configure for Neptune access

    Required for private api auth:
    ------------------------------
    -i (string)   ID of VPC execute-api endpoint

    Required for Cognito auth:
    --------------------------
    -C (string)   Cognito user pool arn

    Required for LambdaRequest / LambdaToken auth:
    ---------------------------------------------
    -A (string)   Lambda authorizer function arn.

    Required for autoscaling:
    -------------------------
    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaing.yml  

    AWS options:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

#-------------------------------------------------------------------------------
# Validate all arguments
#-------------------------------------------------------------------------------

while getopts ":e:c:v:g:n:m:y:z:C:A:i:r:x:sa:R:P:" opt; do
  case ${opt} in

    e  ) export ENVIRONMENT=$OPTARG;;
    c  ) export CONFIG_LOCATION=$OPTARG;;
    v  ) export VPC_ID=$OPTARG;;
    g  ) export CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) export PRIVATE_SUBNET_IDS=$OPTARG;;
    r  ) export PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;
    i  ) export PRIVATE_ENDPOINT_ID=$OPTARG;;

    m  ) export ASSETLIBRARY_MODE=$OPTARG;;

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
valid_modes=( lite full )
incorrect_args=$((incorrect_args+$(verifyListContainsArgument ASSETLIBRARY_MODE m "$ASSETLIBRARY_MODE" "${valid_modes[@]}")))

if [[ "$ASSETLIBRARY_MODE" = "full" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument VPC_ID v "$VPC_ID")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument CDF_SECURITY_GROUP_ID g "$CDF_SECURITY_GROUP_ID")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIVATE_SUBNET_IDS n "$PRIVATE_SUBNET_IDS")))
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument PRIVATE_ROUTE_TABLE_IDS r "$PRIVATE_ROUTE_TABLE_IDS")))
fi

if [[ "$incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"
ASSETLIBRARY_MODE="$(defaultIfNotSet 'ASSETLIBRARY_MODE' m ${ASSETLIBRARY_MODE} 'full')"
CONCURRENT_EXECUTIONS="$(defaultIfNotSet 'CONCURRENT_EXECUTIONS' x ${CONCURRENT_EXECUTIONS} 0)"
APPLY_AUTOSCALING="$(defaultIfNotSet 'APPLY_AUTOSCALING' s ${APPLY_AUTOSCALING} false)"

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}
ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
BASTION_STACK_NAME=cdf-bastion-${ENVIRONMENT}


#-------------------------------------------------------------------------------
# All arguments are good, so inform the user what is configured...
#-------------------------------------------------------------------------------

echo "
Running with:
  ENVIRONMENT:                      $ENVIRONMENT
  CONFIG_LOCATION:                  $CONFIG_LOCATION
  ASSETLIBRARY_MODE:                $ASSETLIBRARY_MODE

  TEMPLATE_SNIPPET_S3_URI_BASE:     $TEMPLATE_SNIPPET_S3_URI_BASE
  API_GATEWAY_DEFINITION_TEMPLATE:  $API_GATEWAY_DEFINITION_TEMPLATE

  API_GATEWAY_AUTH:                 $API_GATEWAY_AUTH
  COGNTIO_USER_POOL_ARN:            $COGNTIO_USER_POOL_ARN
  AUTHORIZER_FUNCTION_ARN:          $AUTHORIZER_FUNCTION_ARN

  VPC_ID:                           $VPC_ID
  CDF_SECURITY_GROUP_ID:            $CDF_SECURITY_GROUP_ID
  PRIVATE_SUBNET_IDS:               $PRIVATE_SUBNET_IDS
  PRIVATE_ROUTE_TABLE_IDS:          $PRIVATE_ROUTE_TABLE_IDS
  PRIVATE_ENDPOINT_ID:              $PRIVATE_ENDPOINT_ID

  CONCURRENT_EXECUTIONS:            $CONCURRENT_EXECUTIONS
  APPLY_AUTOSCALING:                $APPLY_AUTOSCALING

  AWS_REGION:                       $AWS_REGION
  AWS_PROFILE:                      $AWS_PROFILE
"


cwd=$(dirname "$0")

if [[ "$ASSETLIBRARY_MODE" = "full" ]]; then

  logTitle 'Checking deployed Neptune version'

  # The minimum Neptune DB engine that we support.
  min_dbEngineVersion_required='1.0.1.0.200463.0'

  # Let's see if we have previously deployed Neptune before.  If so, we need to check its version
  stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

  neptune_url_export="$NEPTUNE_STACK_NAME-GremlinEndpoint"
  neptune_url=$(echo $stack_exports \
      | jq -r --arg neptune_url_export "$neptune_url_export" \
      '.Exports[] | select(.Name==$neptune_url_export) | .Value')

  if [[ -n "$neptune_url" ]]; then

    # Neptune has been deployed.  Let's grab the name of the ssh key we need to log onto the Bastion
    stack_parameters=$(aws cloudformation describe-stacks --stack-name $BASTION_STACK_NAME $AWS_ARGS) || true
    if [[ -n "$stack_parameters" ]]; then
        key_pair_name=$(echo $stack_parameters \
          | jq -r --arg stack_name "$BASTION_STACK_NAME" \
          '.Stacks[] | select(.StackName==$stack_name) | .Parameters[] | select(.ParameterKey=="KeyPairName") | .ParameterValue')
        key_pair_location="~/.ssh/${key_pair_name}.pem"
        echo Attempting to use key pair: $key_pair_location

        echo "\
        Checking Neptune version using:
            NEPTUNE_STACK_NAME: $NEPTUNE_STACK_NAME
            BASTION_STACK_NAME: $BASTION_STACK_NAME
            key_pair_location:  $key_pair_location
            min_dbEngineVersion_required: $min_dbEngineVersion_required
            AWS_SCRIPT_ARGS:  $AWS_SCRIPT_ARGS
        "

        set +e
        dbEngineVersionCheck=$($cwd/neptune_dbEngineVersion.bash -n $NEPTUNE_STACK_NAME -b $BASTION_STACK_NAME -k "$key_pair_location" -v $min_dbEngineVersion_required -D $AWS_SCRIPT_ARGS)
        set -e
        dbEngineVersionStatus=$(echo $?)

        echo dbEngineVersionStatus: $dbEngineVersionStatus

        if [[ "$dbEngineVersionStatus" -ne 0 ]]; then
          echo "
    ********    WARNING!!!   *********
    Cannot proceed with the deploy as Neptune minimum dbEngine version $min_dbEngineVersion_required is required.  You must upgrade your Neptune instances first!

    Refer to https://docs.aws.amazon.com/neptune/latest/userguide/engine-releases-${min_dbEngineVersion_required}.html for details of how to upgrade.

    "
          exit 1
        fi
    else
        echo "
    ********    WARNING!!!   *********
    No Bastion detected therefore cannot verify version of Neptune.

    "
        exit 1
     fi
  fi

  logTitle 'Determining whether the VPC to deploy Neptune into has an S3 VPC endpoint'
  count=$(aws ec2 describe-vpc-endpoints $AWS_ARGS \
    --filters Name=vpc-id,Values=$VPC_ID Name=service-name,Values=com.amazonaws.$AWS_REGION.s3 | jq  '.VpcEndpoints | length')

  if [[ $count -eq 1 ]]; then
    CREATE_S3_VPC_ENDPOINT='false'
  else
    CREATE_S3_VPC_ENDPOINT='true'
  fi

  logTitle 'Deploying the Neptune CloudFormation template'

  # if first time deploying this will silently fail...
  aws cloudformation set-stack-policy \
    --stack-name $NEPTUNE_STACK_NAME \
    --stack-policy-body "$(cat $cwd/cfn-neptune-stack-policy.json)" \
    $AWS_ARGS | true

  aws cloudformation deploy \
    --template-file $cwd/cfn-neptune.yml \
    --stack-name $NEPTUNE_STACK_NAME \
    --parameter-overrides \
        VpcId=$VPC_ID \
        SecurityGroupId=$CDF_SECURITY_GROUP_ID \
        PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
        PrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS \
        CreateS3VpcEndpoint=$CREATE_S3_VPC_ENDPOINT \
    --capabilities CAPABILITY_NAMED_IAM \
    --no-fail-on-empty-changeset \
    $AWS_ARGS

  aws cloudformation set-stack-policy \
    --stack-name $NEPTUNE_STACK_NAME \
    --stack-policy-body "$(cat $cwd/cfn-neptune-stack-policy.json)" \
    $AWS_ARGS
fi

logTitle 'Setting Asset Library configuration'
aws_iot_endpoint=$(aws iot describe-endpoint  --endpoint-type iot:Data-ATS $AWS_ARGS \
    | jq -r '.endpointAddress')

cat $CONFIG_LOCATION | \
  jq --arg mode "$ASSETLIBRARY_MODE" --arg aws_iot_endpoint "$aws_iot_endpoint" \
  '.mode=$mode | .aws.iot.endpoint=$aws_iot_endpoint' \
  > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION

if [[ "$ASSETLIBRARY_MODE" = "full" ]]; then

  stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

  neptune_url_export="$NEPTUNE_STACK_NAME-GremlinEndpoint"
  neptune_url=$(echo $stack_exports \
      | jq -r --arg neptune_url_export "$neptune_url_export" \
      '.Exports[] | select(.Name==$neptune_url_export) | .Value')

  cat $CONFIG_LOCATION | \
    jq --arg neptune_url "$neptune_url" \
    '.neptuneUrl=$neptune_url' \
    > $CONFIG_LOCATION.tmp && mv $CONFIG_LOCATION.tmp $CONFIG_LOCATION
fi

application_configuration_override=$(cat $CONFIG_LOCATION)

echo "
Using configuration:
$application_configuration_override
"


if [[ "$ASSETLIBRARY_MODE" = "lite" ]]; then

  logTitle 'Enabling Fleet Indexing'
  aws iot update-indexing-configuration \
    --thing-indexing-configuration thingIndexingMode=REGISTRY_AND_SHADOW,thingConnectivityIndexingMode=STATUS \
    --thing-group-indexing-configuration thingGroupIndexingMode=ON \
    $AWS_ARGS &
    
fi

logTitle 'Deploying the Asset Library CloudFormation template'
aws cloudformation deploy \
  --template-file $cwd/build/cfn-assetLibrary-output.yml \
  --stack-name $ASSETLIBRARY_STACK_NAME \
  --parameter-overrides \
      Environment=$ENVIRONMENT \
      ApplicationConfigurationOverride="$application_configuration_override" \
      VpcId=$VPC_ID \
      CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
      PrivateSubNetIds=$PRIVATE_SUBNET_IDS \
      PrivateApiGatewayVPCEndpoint=$PRIVATE_ENDPOINT_ID \
      Mode=$ASSETLIBRARY_MODE \
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



if [[ "$ASSETLIBRARY_MODE" = "full" ]]; then

  logTitle 'Initializing the Asset Library data'
  # init asset library database using lambda invoke, as the api may require
  # authorization, or even be deployed as a private endpoint

  # if autoscaling is configured for the lambda, the lambda may not be ready when cloudformation
  # reports as completed, therefore keep retrying until it is.

  max_retries=20
  retry_interval=3.0
  retry_count=0
  while [[ $retry_count < $max_retries ]]; do

    response=$( lambaInvokeRestApi "$ASSETLIBRARY_STACK_NAME" 'POST' '/48e876fe-8830-4996-baa0-9c0dd92bd6a2/init' )
    status_code=$(echo "$response" | jq -r '.statusCode')

    if [[ ${status_code} -eq 204 ]] || [[ ${status_code} -eq 409 ]]; then
      break
    fi

    echo "Retrying assetlibrary initialization : $retry_count"
    retry_count=$retry_count+1
    retry_count=$((retry_count+1))
    sleep $retry_interval
  done

  case ${status_code} in
    204)
        echo "Assetlibrary successfully initialized status code ${status_code}";;
    409)
      echo "Assetlibrary already initialized status code $status_code";;
    401)
      echo "Assetlibrary unauthorized code $status_code";;
    *)
      echo "Assetlibrary failed to initialize status code ${status_code}";;
  esac

fi

logTitle 'Asset Library deployment complete!'
