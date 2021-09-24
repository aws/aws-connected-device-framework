#!/bin/bash
#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

set -e
if [[ "$DEBUG" == "true" ]]; then
    set -x
fi

function help_message {
    cat << EOF

NAME

    deploy-core.bash    

DESCRIPTION

    Deploys the CDF core services.

MANDATORY ARGUMENTS:

    -e (string)   Name of environment.
    -c (string)   Location of infrastructure project containing CDF application configuration.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.


OPTIONAL ARGUMENTS

    COMMON OPTIONS::
    ----------------
    -E (string)   Name of configuration environment.  If not provided, then '-e ENVIRONMENT' is used.
    -b (string)   The name of the S3 bucket to deploy CloudFormation templates into.  If not provided, a new bucket named 'cdf-cfn-artifacts-$AWS_ACCOUNT_ID-$AWS_REGION' is created.
    -k (string)   The KMS Key id for services requiring access to decrypt sensitive information.  If neither this or -K (KMS key alias) is provided, a new KMS key with the alias 'cdf-{Environment}' is created and reused for re-deployments.
    -K (string)   The KMS Key alias for services requiring access to decrypt sensitive information.  If it does not exist, a new KMS key with this alias will be created. If neither this or -k (KMS key ID) is provided, a new KMS key with the alias 'cdf-{Environment}' is created and reused for re-deployments.

    COMMON AUTH OPTIONS::
    -------------------------------
    -a (string)   API Gateway authorization type. Must be from the following list (default is None):
                      - None
                      - Private
                      - Cognito
                      - LambdaRequest
                      - LambdaToken
                      - ApiKey
                      - IAM

    COMMON PRIVATE API AUTH OPTIONS, OR ASSET LIBRARY (FULL) MODE::
    -------------------------------------------------------------------
    -N (flag)     Use an existing VPC instead of creating a new one.
    -v (string)   ID of VPC to deploy into (required if -N set)
    -g (string)   ID of CDF security group (required if -N set)
    -n (string)   ID of private subnets (comma delimited) (required if -N set)
    -o (string)   ID of public subnets (comma delimited) (required if -N set)
    -r (string)   ID of private route tables (comma delimited) (required if -N set)
    -I (string)   ID of VPC endpoint (required if -N set)

    COMMON COGNITO AUTH OPTIONS:
    --------------------------
    -C (string)   Cognito user pool arn

    COMMON LAMBDA REQUEST/TOKEN AUTH OPTIONS:
    ---------------------------------------------
    -A (string)   Lambda authorizer function arn.

    ASSET LIBRARY OPTIONS:
    -----------------------
    -m (string)   Asset Library mode ('full' or 'lite').  Defaults to full if not provided.
    -p (string)   The name of the key pair to use to deploy the Bastion EC2 host (required for Asset Library (full) mode or Private auth mode).
    -i (string)   The remote access CIDR to configure Bastion SSH access (e.g. 1.2.3.4/32) (required for Asset Library (full) mode).

    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaling.yml

    -D (string)   Snapshot ID of Neptune database backup to restore from. Note: once restored from a backup, the same snapshot identifier must be specified for all future deployments too.

    ASSET LIBRARY EXPORT OPTIONS:
    -----------------------
    -X (string)   Schedule expression to run the asset library export

    NOTIFICATION OPTIONS:
    ---------------------
    -S (flag)     If provided, the DAX cluster will be deployed into a dedicated subnet group based on the provided private subnet ids within a VPC. 
                  If not provided (default), the DAX cluster will be deployed into the default subnets.

    COMPILING OPTIONS:
    ------------------
    -B (flag)     Bypass bundling each module.  If deploying from a prebuilt tarfile rather than source code, setting this flag will speed up the deploy.
    -Y (flag)     Proceed with install bypassing the prompt requesting permission continue.

    AWS OPTIONS:
    ------------
    -R (string)   AWS region.
    -P (string)   AWS profile.

DEPENDENCIES REQUIRED:

    - aws-cli
    - jq
    - zip
    - git
    - pnpm
    
EOF
}


#-------------------------------------------------------------------------------
# Validate all COMMON arguments.  Any SERVICE specific arguments are validated
# by the service specific deployment script.
#-------------------------------------------------------------------------------

while getopts ":e:E:c:p:i:k:K:b:a:y:z:C:A:Nv:g:n:m:X:o:r:I:x:sD:SBYR:P:" opt; do
  case $opt in
    e  ) ENVIRONMENT=$OPTARG;;
    E  ) CONFIG_ENVIRONMENT=$OPTARG;;
    c  ) CONFIG_LOCATION=$OPTARG;;

    p  ) KEY_PAIR_NAME=$OPTARG;;
    i  ) BASTION_REMOTE_ACCESS_CIDR=$OPTARG;;
    k  ) KMS_KEY_ID=$OPTARG;;
    K  ) KMS_KEY_ALIAS=$OPTARG;;
    b  ) DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
    m  ) ASSETLIBRARY_MODE=$OPTARG;;

    x  ) CONCURRENT_EXECUTIONS=$OPTARG;;
    s  ) APPLY_AUTOSCALING=true;;

    D  ) ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER=$OPTARG;;

    X  ) SCHEDULE_EXPRESSION=$OPTARG;;

    S  ) NOTIFICATIONS_CUSTOM_SUBNETS=true;;

    a  ) API_GATEWAY_AUTH=$OPTARG;;
    y  ) TEMPLATE_SNIPPET_S3_URI_BASE=$OPTARG;;
    z  ) API_GATEWAY_DEFINITION_TEMPLATE=$OPTARG;;
    C  ) COGNTIO_USER_POOL_ARN=$OPTARG;;
    A  ) AUTHORIZER_FUNCTION_ARN=$OPTARG;;

    N  ) USE_EXISTING_VPC=true;;
    v  ) VPC_ID=$OPTARG;;
    g  ) CDF_SECURITY_GROUP_ID=$OPTARG;;
    n  ) PRIVATE_SUBNET_IDS=$OPTARG;;
    o  ) PUBLIC_SUBNET_IDS=$OPTARG;;
    r  ) PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;
    I  ) VPCE_ID=$OPTARG;;

    B  ) BYPASS_BUNDLE=true;;
    Y  ) BYPASS_PROMPT=true;;

    R  ) AWS_REGION=$OPTARG;;
    P  ) AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

# path is from aws-connected-device-framework root
source ./infrastructure/common-deploy-functions.bash

incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
CONFIG_ENVIRONMENT="$(defaultIfNotSet 'CONFIG_ENVIRONMENT' E ${CONFIG_ENVIRONMENT} ${ENVIRONMENT})"
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



API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"

ASSETLIBRARY_MODE="$(defaultIfNotSet 'ASSETLIBRARY_MODE' m ${ASSETLIBRARY_MODE} 'full')"
SCHEDULE_EXPRESSION="$(defaultIfNotSet 'SCHEDULE_EXPRESSION' X ${SCHEDULE_EXPRESSION} 'N/A')"

KMS_KEY_ALIAS="$(defaultIfNotSet 'KMS_KEY_ALIAS' K cdf-${ENVIRONMENT} 'None')"

if [[ -z "$USE_EXISTING_VPC" ||  "$USE_EXISTING_VPC" = "false" ]]; then
    # if private api auth, or asset library full mode, is configured then these will get overwritten
    VPC_ID='N/A'
    CDF_SECURITY_GROUP_ID='N/A'
    PRIVATE_SUBNET_IDS='N/A'
    PUBLIC_SUBNET_IDS='N/A'
    PRIVATE_ROUTE_TABLE_IDS='N/A'
    VPCE_ID='N/A'

fi

cognito_auth_arg=
if [ "$API_GATEWAY_AUTH" = "Cognito" ]; then
    cognito_auth_arg="-C ${COGNTIO_USER_POOL_ARN}"
fi

lambda_invoker_auth_arg=
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    lambda_invoker_auth_arg="-A ${AUTHORIZER_FUNCTION_ARN}"
fi


if [[ "incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

if [ -z "$AWS_REGION" ]; then
	AWS_REGION=$(aws configure get region $AWS_ARGS)
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )
AWS_SCRIPT_ARGS=$(buildAwsScriptArgs "$AWS_REGION" "$AWS_PROFILE" )

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)




##########################################################
######  confirm whether to proceed or not           ######
##########################################################

config_message="
**********************************************************
*****   AWS Connected Device Framework                  ******
**********************************************************

The AWS Connected Device Framework (CDF) will install using the following configuration:

    -e (ENVIRONMENT)                    : $ENVIRONMENT
    -E (CONFIG_ENVIRONMENT)             : $CONFIG_ENVIRONMENT
    -c (CONFIG_LOCATION)                : $CONFIG_LOCATION

    -y (TEMPLATE_SNIPPET_S3_URI_BASE)    : $TEMPLATE_SNIPPET_S3_URI_BASE
    -z (API_GATEWAY_DEFINITION_TEMPLATE) : $API_GATEWAY_DEFINITION_TEMPLATE

    -a (API_GATEWAY_AUTH)               : $API_GATEWAY_AUTH
    -C (COGNTIO_USER_POOL_ARN)          : $COGNTIO_USER_POOL_ARN
    -A (AUTHORIZER_FUNCTION_ARN)        : $AUTHORIZER_FUNCTION_ARN

    -b (DEPLOY_ARTIFACTS_STORE_BUCKET)  : $DEPLOY_ARTIFACTS_STORE_BUCKET
    -p (KEY_PAIR_NAME)                  : $KEY_PAIR_NAME
    -k (KMS_KEY_ID)                     : $KMS_KEY_ID
    -K (KMS_KEY_ALIAS)                  : $KMS_KEY_ALIAS

    -m (ASSETLIBRARY_MODE)              : $ASSETLIBRARY_MODE
    -i (BASTION_REMOTE_ACCESS_CIDR)     : $BASTION_REMOTE_ACCESS_CIDR
    -x (CONCURRENT_EXECUTIONS):         : $CONCURRENT_EXECUTIONS
    -s (APPLY_AUTOSCALING):             : $APPLY_AUTOSCALING
    -D (ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER)    : $ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER

    -S (NOTIFICATIONS_CUSTOM_SUBNETS)   : $NOTIFICATIONS_CUSTOM_SUBNETS

    -N (USE_EXISTING_VPC)               : $USE_EXISTING_VPC"

if [[ -z "$USE_EXISTING_VPC"  ||  "$USE_EXISTING_VPC" = "false" ]]; then
    config_message+='not provided, therefore a new vpc will be created'
else
    config_message+="
    -v (VPC_ID)                         : $VPC_ID
    -g (CDF_SECURITY_GROUP_ID)          : $CDF_SECURITY_GROUP_ID
    -n (PRIVATE_SUBNET_IDS)             : $PRIVATE_SUBNET_IDS
    -o (PUBLIC_SUBNET_IDS)              : $PUBLIC_SUBNET_IDS
    -r (PRIVATE_ROUTE_TABLE_IDS)        : $PRIVATE_ROUTE_TABLE_IDS
    -I (VPCE_ID)                        : $VPCE_ID"
fi

config_message+="
    -R (AWS_REGION)                     : $AWS_REGION
    -P (AWS_PROFILE)                    : $AWS_PROFILE
        AWS_ACCOUNT_ID                  : $AWS_ACCOUNT_ID
    -B (BYPASS_BUNDLE)                  : $BYPASS_BUNDLE"

if [[ -z "$BYPASS_BUNDLE" ]]; then
    config_message+='not provided, therefore each TypeScript project will be bundled'
fi

asksure "$config_message" $BYPASS_PROMPT


root_dir=$(pwd)

######################################################################
######  stack names                                             ######
######################################################################

ASSETLIBRARY_HISTORY_STACK_NAME=cdf-assetlibraryhistory-${ENVIRONMENT}
ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
BASTION_STACK_NAME=cdf-bastion-${ENVIRONMENT}
BULKCERTS_STACK_NAME=cdf-bulkcerts-${ENVIRONMENT}
CERTIFICATEACTIVATOR_STACK_NAME=cdf-certificateactivator-${ENVIRONMENT}
CERTIFICATEVENDOR_STACK_NAME=cdf-certificatevendor-${ENVIRONMENT}
COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}
DEVICE_MONITORING_STACK_NAME=cdf-device-monitoring-${ENVIRONMENT}
EVENTSALERTS_STACK_NAME=cdf-eventsAlerts-${ENVIRONMENT}
EVENTSPROCESSOR_STACK_NAME=cdf-eventsProcessor-${ENVIRONMENT}
NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}
NETWORK_STACK_NAME=cdf-network-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
OPENSSL_LAYER_STACK_NAME=cdf-openssl-${ENVIRONMENT}
DEPLOYMENT_HELPER_STACK_NAME=cdf-deployment-helper-${ENVIRONMENT}
DEPLOYMENT_HELPER_VPC_STACK_NAME=cdf-deployment-helper-vpc-${ENVIRONMENT}


if [ -z "$BYPASS_BUNDLE" ]; then
    logTitle 'Bundling applications'
    $root_dir/infrastructure/bundle-core.bash
fi

logTitle 'Configuring S3 Deployment bucket'
if [ -z "$DEPLOY_ARTIFACTS_STORE_BUCKET" ]; then
    DEPLOY_ARTIFACTS_STORE_BUCKET="cdf-cfn-artifacts-$AWS_ACCOUNT_ID-$AWS_REGION"
fi

if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_ARGS &
else
    aws s3api create-bucket --bucket "$DEPLOY_ARTIFACTS_STORE_BUCKET" --create-bucket-configuration LocationConstraint="$AWS_REGION" $AWS_ARGS &
fi

logTitle 'Enabling default encryption on the bucket'

aws s3api put-bucket-encryption --bucket "$DEPLOY_ARTIFACTS_STORE_BUCKET" --server-side-encryption-configuration '{
    "Rules": [
            {
            "ApplyServerSideEncryptionByDefault": {
                "SSEAlgorithm": "AES256"
            }
        }
        ]
    }' $AWS_ARGS &

logTitle 'Uploading Cloudformation template snippets'

for snippet in $(ls "$root_dir"/infrastructure/cloudformation/snippets/*); do
    key="$TEMPLATE_SNIPPET_S3_URI_BASE"$(basename "$snippet")
    aws s3 cp "$snippet" "$key" $AWS_ARGS
done


logTitle 'Configuring KMS key'
if [ -z "$KMS_KEY_ID" ]; then
    echo '
No KMS_KEY_ID provided, therefore checking whether a KMS alias already exists for the deployment.
'
    KMS_KEY_ID=$(aws kms list-aliases  $AWS_ARGS | jq -r --arg alias "alias/$KMS_KEY_ALIAS"  '.Aliases[] | select(.AliasName==$alias) | .TargetKeyId')

    if [ -z "$KMS_KEY_ID" ]; then
        echo '
No existing key found via alias, therefore creating a new one.
'
        keys=$(aws kms create-key --description "CDF encryption key ($ENVIRONMENT)" $AWS_ARGS)
        KMS_KEY_ID=$(echo "$keys" | jq -r '.KeyMetadata.KeyId')
        aws kms enable-key-rotation --key-id $KMS_KEY_ID $AWS_ARGS
        aws kms create-alias --alias-name alias/$KMS_KEY_ALIAS --target-key-id $KMS_KEY_ID $AWS_ARGS
        echo "Created KMS Key Id: $KMS_KEY_ID"
    else
        echo '
Reusing existing KMS Key found via alias.
'
    fi
else
    echo '
Reusing existing KMS Key found via id.
'

fi

############################################################################################
# DEPLOYMENT HELPER
############################################################################################
logTitle 'Deploying Deployment Helper'
cd "$root_dir/packages/libraries/core/deployment-helper"
infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
infrastructure/deploy-cfn.bash \
    -e "$ENVIRONMENT" \
    -a $DEPLOY_ARTIFACTS_STORE_BUCKET \
    -v "$VPC_ID" \
    $AWS_SCRIPT_ARGS

stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

# TODO: We should create a function to extract parameters from stack exports 
# i.e s3_vpc_endpoint_check=$(extractExport $exports "$DEPLOYMENT_HELPER_STACK_NAME-isS3VpcEndpointEnabled")
# the above function should cut down the boilerplate to extract cfn exports out of a list
custom_resource_lambda_arn_export="$DEPLOYMENT_HELPER_STACK_NAME-customResourceLambdaArn"
CUSTOM_RESOURCE_LAMBDA_ARN=$(echo "$stack_exports" \
        | jq -r --arg custom_resource_lambda_arn_export "$custom_resource_lambda_arn_export" \
        '.Exports[] | select(.Name==$custom_resource_lambda_arn_export) | .Value')

s3_vpc_endpoint_check_export="$DEPLOYMENT_HELPER_STACK_NAME-isS3VpcEndpointEnabled"
s3_vpc_endpoint_check=$(echo "$stack_exports" \
        | jq -r --arg s3_vpc_endpoint_check_export "$s3_vpc_endpoint_check_export" \
        '.Exports[] | select(.Name==$s3_vpc_endpoint_check_export) | .Value')

dynamodb_vpc_endpoint_check_export="$DEPLOYMENT_HELPER_STACK_NAME-isDynamoDBVpcEndpointEnabled"
dynamodb_vpc_endpoint_check_check=$(echo "$stack_exports" \
        | jq -r --arg dynamodb_vpc_endpoint_check_export "$dynamodb_vpc_endpoint_check_export" \
        '.Exports[] | select(.Name==$dynamodb_vpc_endpoint_check_export) | .Value')

api_vpc_endpoint_check_export="$DEPLOYMENT_HELPER_STACK_NAME-isPrivateApiGatewayVPCEndpointEnabled"
api_vpc_endpoint_check_check=$(echo "$stack_exports" \
        | jq -r --arg api_vpc_endpoint_check_export "$api_vpc_endpoint_check_export" \
        '.Exports[] | select(.Name==$api_vpc_endpoint_check_export) | .Value')

############################################################################################
# NETWORKING
############################################################################################
assetlibrary_config=$CONFIG_LOCATION/assetlibrary/$CONFIG_ENVIRONMENT-config.json
if [[ -f $assetlibrary_config && "$ASSETLIBRARY_MODE" = "full" &&  ( -z "$USE_EXISTING_VPC" || "$USE_EXISTING_VPC" = "false" ) ]] || [[ "$API_GATEWAY_AUTH" == "Private" && ( -z "$USE_EXISTING_VPC" || "$USE_EXISTING_VPC" = "false" ) ]]; then

    logTitle 'Deploying Networking'

    cd "$root_dir/infrastructure"

    NETWORKING_DEPLOY_PARAMETERS=()
    NETWORKING_DEPLOY_PARAMETERS+=( Environment=$ENVIRONMENT )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingVpcId=$VPC_ID )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingCDFSecurityGroupId=$CDF_SECURITY_GROUP_ID )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingPrivateSubnetIds=$PRIVATE_SUBNET_IDS )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingPublicSubnetIds=$PUBLIC_SUBNET_IDS )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingPrivateApiGatewayVPCEndpoint=$VPCE_ID )
    NETWORKING_DEPLOY_PARAMETERS+=( ExistingPrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS )
    #TODO: move these below as else
    NETWORKING_DEPLOY_PARAMETERS+=( EnableS3VpcEndpoint='true' )
    NETWORKING_DEPLOY_PARAMETERS+=( EnableDynamoDBVpcEndpoint='true' )
    NETWORKING_DEPLOY_PARAMETERS+=( EnablePrivateApiGatewayVPCEndpoint='true' )

    if [[( -n "$USE_EXISTING_VPC" && "$USE_EXISTING_VPC" = "true" )]]; then
        NETWORKING_DEPLOY_PARAMETERS+=( EnableS3VpcEndpoint=$s3_vpc_endpoint_check )
        NETWORKING_DEPLOY_PARAMETERS+=( EnableDynamoDBVpcEndpoint=$dynamodb_vpc_endpoint_check_check )
        NETWORKING_DEPLOY_PARAMETERS+=( EnablePrivateApiGatewayVPCEndpoint=$api_vpc_endpoint_check_check )
    fi

    aws cloudformation deploy \
        --template-file cloudformation/cfn-networking.yaml \
        --stack-name "$NETWORK_STACK_NAME" --no-fail-on-empty-changeset \
        --parameter-overrides "${NETWORKING_DEPLOY_PARAMETERS[@]}" \
        --capabilities CAPABILITY_NAMED_IAM \
        $AWS_ARGS

    stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

    vpc_id_export="$NETWORK_STACK_NAME-VpcId"
    VPC_ID=$(echo "$stack_exports" \
        | jq -r --arg vpc_id_export "$vpc_id_export" \
        '.Exports[] | select(.Name==$vpc_id_export) | .Value')

    vpce_id_export="$NETWORK_STACK_NAME-PrivateApiGatewayVPCEndpoint"
    VPCE_ID=$(echo "$stack_exports" \
        | jq -r --arg vpce_id_export "$vpce_id_export" \
        '.Exports[] | select(.Name==$vpce_id_export) | .Value')

    cdf_security_group_id_export="$NETWORK_STACK_NAME-SecurityGroupId"
    CDF_SECURITY_GROUP_ID=$(echo "$stack_exports" \
        | jq -r --arg cdf_security_group_id_export "$cdf_security_group_id_export" \
        '.Exports[] | select(.Name==$cdf_security_group_id_export) | .Value')

    private_subnet_ids_export="$NETWORK_STACK_NAME-PrivateSubnetIds"
    PRIVATE_SUBNET_IDS=$(echo "$stack_exports" \
        | jq -r --arg private_subnet_ids_export "$private_subnet_ids_export" \
        '.Exports[] | select(.Name==$private_subnet_ids_export) | .Value')

    public_subnet_ids_export="$NETWORK_STACK_NAME-PublicSubnetIds"
    PUBLIC_SUBNET_IDS=$(echo "$stack_exports" \
        | jq -r --arg public_subnet_ids_export "$public_subnet_ids_export" \
        '.Exports[] | select(.Name==$public_subnet_ids_export) | .Value')

    private_routetable_ids_export="$NETWORK_STACK_NAME-PrivateRouteTableIds"
    PRIVATE_ROUTE_TABLE_IDS=$(echo "$stack_exports" \
        | jq -r --arg private_routetable_ids_export "$private_routetable_ids_export" \
        '.Exports[] | select(.Name==$private_routetable_ids_export) | .Value')

fi

############################################################################################
# DEPLOYMENT HELPER VPC
############################################################################################
if [[ -f $assetlibrary_config && "$ASSETLIBRARY_MODE" = "full" ]] || [[ "$API_GATEWAY_AUTH" == "Private" ]] || [[( -z "$USE_EXISTING_VPC" || "$USE_EXISTING_VPC" = "false" ) ]]; then
    logTitle 'Deploying Deployment Helper VPC'
    cd "$root_dir/packages/libraries/core/deployment-helper"
    infrastructure/deploy-vpc-cfn.bash \
        -e "$ENVIRONMENT" \
        -a $DEPLOY_ARTIFACTS_STORE_BUCKET \
        -v $VPC_ID \
        -g $CDF_SECURITY_GROUP_ID \
        -n $PRIVATE_SUBNET_IDS \
        $AWS_SCRIPT_ARGS

    stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

    custom_resource_vpc_lambda_arn_export="$DEPLOYMENT_HELPER_VPC_STACK_NAME-customResourceVpcLambdaArn"
    CUSTOM_RESOURCE_VPC_LAMBDA_ARN=$(echo "$stack_exports" \
            | jq -r --arg custom_resource_vpc_lambda_arn_export "$custom_resource_vpc_lambda_arn_export" \
            '.Exports[] | select(.Name==$custom_resource_vpc_lambda_arn_export) | .Value')
fi

############################################################################################
# LAMBDA LAYERS
############################################################################################
logTitle 'Deploying lambda layers'
lambda_layers_root="$root_dir/infrastructure/lambdaLayers"
for layer in $(ls $lambda_layers_root); do
    cd "$lambda_layers_root/$layer"
    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT $AWS_SCRIPT_ARGS
done

logTitle 'Deploying services'
############################################################################################
# ASSET LIBRARY
############################################################################################

if [ -f "$assetlibrary_config" ]; then

    logTitle 'Deploying Asset Library'

    cd "$root_dir/packages/services/assetlibrary"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS

    # TODO: if these are common args and can be shared across stacks such as gg provisioning then they should be out of here and put next to defaults
    assetlibrary_concurrent_executions_arg=
    if [ -n "$CONCURRENT_EXECUTIONS" ]; then
        assetlibrary_concurrent_executions_arg="-x $CONCURRENT_EXECUTIONS"
    fi

    assetlibrary_autoscaling_arg=
    if [ "$APPLY_AUTOSCALING" = "true" ]; then
        assetlibrary_autoscaling_arg="-s"
    fi

    db_snapshot_identifier_arg=
    if [ -n "$ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER" ]; then
        db_snapshot_identifier_arg="-D $ASSETLIBRARY_DB_SNAPSHOT_IDENTIFIER"
    fi

    custom_resource_vpc_lambda_arn=
    if [ -n "$CUSTOM_RESOURCE_VPC_LAMBDA_ARN" ]; then
        custom_resource_vpc_lambda_arn="-l $CUSTOM_RESOURCE_VPC_LAMBDA_ARN"
    fi
    
    cd "$root_dir/packages/services/assetlibrary"
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$assetlibrary_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -r "$PRIVATE_ROUTE_TABLE_IDS" \
        -m "$ASSETLIBRARY_MODE" \
        $custom_resource_vpc_lambda_arn \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $assetlibrary_concurrent_executions_arg \
        $assetlibrary_autoscaling_arg \
        $db_snapshot_identifier_arg \
        $AWS_SCRIPT_ARGS

    asset_library_deployed="true"

fi

############################################################################################
# PROVISIONING
############################################################################################
provisioning_config=$CONFIG_LOCATION/provisioning/$CONFIG_ENVIRONMENT-config.json
if [ -f "$provisioning_config" ]; then

    logTitle 'Deploying provisioning'

    cd "$root_dir/packages/services/provisioning"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$provisioning_config" \
        -k "$KMS_KEY_ID" \
        -o "$OPENSSL_LAYER_STACK_NAME" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS

else
   echo 'NOT DEPLOYING: provisioning'
fi

############################################################################################
# COMMANDS
############################################################################################
commands_config=$CONFIG_LOCATION/commands/$CONFIG_ENVIRONMENT-config.json
if [ -f "$commands_config" ]; then

    logTitle 'Deploying commands'

    cd "$root_dir/packages/services/commands"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$commands_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        -k "$KMS_KEY_ID" \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: commands'
fi

############################################################################################
# DEVICE MONITORING
############################################################################################
devicemonitoring_config=$CONFIG_LOCATION/devicemonitoring/$CONFIG_ENVIRONMENT-config.json
if [ -f "$devicemonitoring_config" ]; then

    logTitle 'Deploying device monitoring'

    cd "$root_dir/packages/services/device-monitoring"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$devicemonitoring_config" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: device monitoring'
fi

############################################################################################
# EVENTS PROCESSOR
############################################################################################
eventsprocessor_config=$CONFIG_LOCATION/events-processor/$CONFIG_ENVIRONMENT-config.json
if [ -f "$eventsprocessor_config" ]; then

    logTitle 'Deploying events processor'

    cd "$root_dir/packages/services/events-processor"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$eventsprocessor_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        -k "$KMS_KEY_ID" \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: events-processor'
fi

############################################################################################
# CERTIFICATE ACTIVATOR
############################################################################################
certificateactivator_config=$CONFIG_LOCATION/certificateactivator/$CONFIG_ENVIRONMENT-config.json
if [ -f "$certificateactivator_config" ]; then

    logTitle 'Deploying certificate activator'

    cd "$root_dir/packages/services/certificateactivator"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$certificateactivator_config" \
        -o $OPENSSL_LAYER_STACK_NAME \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: certificate activator'
fi

############################################################################################
# CERTIFICATE VENDOR
############################################################################################
certificatevendor_config=$CONFIG_LOCATION/certificatevendor/$CONFIG_ENVIRONMENT-config.json
if [ -f "$certificatevendor_config" ]; then

    logTitle 'Deploying certificate vendor'

    cd "$root_dir/packages/services/certificatevendor"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$certificatevendor_config" \
        -r AssetLibrary \
        -k "$KMS_KEY_ID" \
        -o $OPENSSL_LAYER_STACK_NAME \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: certificate vendor'
fi

############################################################################################
# BULK CERTS
############################################################################################
bulkcerts_config=$CONFIG_LOCATION/bulkcerts/$CONFIG_ENVIRONMENT-config.json
if [ -f "$bulkcerts_config" ]; then

    logTitle 'Deploying bulkcerts'

    cd "$root_dir/packages/services/bulkcerts"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$bulkcerts_config" \
        -k "$KMS_KEY_ID" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -o $OPENSSL_LAYER_STACK_NAME \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: bulk certs'
fi

############################################################################################
# EVENTS ALERTS
############################################################################################
eventsalerts_config=$CONFIG_LOCATION/events-alerts/$CONFIG_ENVIRONMENT-config.json
if [ -f "$eventsalerts_config" ]; then

    logTitle 'Deploying events alerts'

    cd "$root_dir/packages/services/events-alerts"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -k "$KMS_KEY_ID" \
        -c "$eventsalerts_config" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: events alerts'
fi


############################################################################################
# ASSET LIBRARY HISTORY
############################################################################################
assetlibraryhistory_config=$CONFIG_LOCATION/assetlibraryhistory/$CONFIG_ENVIRONMENT-config.json
if [ -f "$assetlibraryhistory_config" ]; then

    logTitle 'Deploying asset library history'

    cd "$root_dir/packages/services/assetlibraryhistory"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$assetlibraryhistory_config" \
        -t 'cdf/assetlibrary/events/#' \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        -k "$KMS_KEY_ID" \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: asset library history'
fi

############################################################################################
# ASSET LIBRARY EXPORT
############################################################################################
assetlibrary_export_config=$CONFIG_LOCATION/assetlibrary-export/$CONFIG_ENVIRONMENT-config.json
if [ -f "$assetlibrary_export_config" ]; then
    logTitle 'Deploying Asset Library Export'

    cd "$root_dir/packages/services/assetlibrary-export"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$assetlibrary_export_config" \
        -k "$KMS_KEY_ID" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -s "$SCHEDULE_EXPRESSION" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: Simulation Launcher'
fi

############################################################################################
# GREENGRASS PROVISIONING
############################################################################################
 greengrassProvisioning_config=$CONFIG_LOCATION/greengrass-provisioning/$CONFIG_ENVIRONMENT-config.json
 if [ -f "$greengrassProvisioning_config" ]; then

     logTitle 'Deploying Greengrass Provisioning'

     cd "$root_dir/packages/services/greengrass-provisioning"

     infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
     infrastructure/deploy-cfn.bash \
         -e "$ENVIRONMENT" \
         -k "$KMS_KEY_ID" \
         -c "$greengrassProvisioning_config"  \
         -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
         -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
         -a "$API_GATEWAY_AUTH" \
         -v "$VPC_ID" \
         -g "$CDF_SECURITY_GROUP_ID" \
         -n "$PRIVATE_SUBNET_IDS" \
         -i "$VPCE_ID" \
         $cognito_auth_arg \
         $lambda_invoker_auth_arg \
         $AWS_SCRIPT_ARGS
 else
    echo 'NOT DEPLOYING: Greengrass Provisioning'
 fi

############################################################################################
# GREENGRASS DEPLOYMENT
############################################################################################
 greengrassDeployment_config=$CONFIG_LOCATION/greengrass-deployment/$CONFIG_ENVIRONMENT-config.json
 if [ -f "$greengrassDeployment_config" ]; then
     logTitle 'Deploying Greengrass Deployment'

     cd "$root_dir/packages/services/greengrass-deployment"

     infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
     infrastructure/deploy-cfn.bash \
         -e "$ENVIRONMENT" \
         -c "$greengrassDeployment_config" \
         -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
         -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
         -a "$API_GATEWAY_AUTH" \
         -v "$VPC_ID" \
         -g "$CDF_SECURITY_GROUP_ID" \
         -n "$PRIVATE_SUBNET_IDS" \
         -i "$VPCE_ID" \
         -k "$KMS_KEY_ID" \
         $cognito_auth_arg \
         $lambda_invoker_auth_arg \
         $AWS_SCRIPT_ARGS
 else
    echo 'NOT DEPLOYING: Greengrass Deployment'
 fi

############################################################################################
# SIMULATION LAUNCHER
############################################################################################
simulation_launcher_config=$CONFIG_LOCATION/simulation-launcher/$CONFIG_ENVIRONMENT-config.json
if [ -f "$simulation_launcher_config" ]; then
    
    logTitle 'Bundling the JMeter container'

    cd "$root_dir/packages/services/simulation-launcher/src/containers/jmeter/infrastructure"
    ./bundle.bash

    logTitle 'Deploying Simulation Launcher'

    cd "$root_dir/packages/services/simulation-launcher"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -b \
        -e "$ENVIRONMENT" \
        -c "$simulation_launcher_config" \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        -k "$KMS_KEY_ID" \
        -v "$VPC_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: Simulation Launcher'
fi


############################################################################################
# SIMULATION MANAGER
############################################################################################
simulation_manager_config=$CONFIG_LOCATION/simulation-manager/$CONFIG_ENVIRONMENT-config.json
if [ -f "$simulation_manager_config" ]; then
    logTitle 'Deploying Simulation Manager'

    cd "$root_dir/packages/services/simulation-manager"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash \
        -e "$ENVIRONMENT" \
        -c "$simulation_manager_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" \
        -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -l "$CUSTOM_RESOURCE_LAMBDA_ARN" \
        -k "$KMS_KEY_ID" \
        -a "$API_GATEWAY_AUTH" \
        -v "$VPC_ID" \
        -g "$CDF_SECURITY_GROUP_ID" \
        -n "$PRIVATE_SUBNET_IDS" \
        -i "$VPCE_ID" \
        $cognito_auth_arg \
        $lambda_invoker_auth_arg \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: Simulation Manager'
fi

logTitle 'CDF deployment complete!'
