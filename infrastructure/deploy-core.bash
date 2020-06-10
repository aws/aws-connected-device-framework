#!/bin/bash

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
    -k (string)   The KMS Key id that the provisioning service will use to decrypt sensitive information.  If not provided, a new KMS key with the alias 'cdf' is created.

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
    -i (string)   ID of VPC endpoint (required if -N set)
    -r (string)   ID of private route tables (comma delimited) (required if -N set)

    COMMON PRIVATE API AUTH OPTIONS:
    ------------------------------
    -i (string)   ID of VPC execute-api endpoint

    COMMON COGNITO AUTH OPTIONS:
    --------------------------
    -C (string)   Cognito user pool arn

    COMMON LAMBDA REQUEST/TOKEN AUTH OPTIONS:
    ---------------------------------------------
    -A (string)   Lambda authorizer function arn.

    ASSET LIBRARY OPTIONS::
    -----------------------
    -m (string)   Asset Library mode ('full' or 'lite').  Defaults to full if not provided.
    -p (string)   The name of the key pair to use to deploy the Bastion EC2 host (required for Asset Library (full) mode or Private auth mode).
    -i (string)   The remote access CIDR to configure Bastion SSH access (e.g. 1.2.3.4/32) (required for Asset Library (full) mode).

    -x (number)   No. of concurrent executions to provision.
    -s (flag)     Apply autoscaling as defined in ./cfn-autosclaling.yml

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

while getopts ":e:E:c:p:i:k:b:a:y:z:C:A:Nv:g:n:m:o:r:x:sBYR:P:" opt; do
  case $opt in
    e  ) ENVIRONMENT=$OPTARG;;
    E  ) CONFIG_ENVIRONMENT=$OPTARG;;
    c  ) CONFIG_LOCATION=$OPTARG;;

    p  ) KEY_PAIR_NAME=$OPTARG;;
    i  ) BASTION_REMOTE_ACCESS_CIDR=$OPTARG;;
    k  ) KMS_KEY_ID=$OPTARG;;
    b  ) DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
    m  ) ASSETLIBRARY_MODE=$OPTARG;;

    x  ) CONCURRENT_EXECUTIONS=$OPTARG;;
    s  ) APPLY_AUTOSCALING=true;;

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

    B  ) BYPASS_BUNDLE=true;;
    Y  ) BYPASS_PROMPT=true;;

    R  ) AWS_REGION=$OPTARG;;
    P  ) AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

# path is from cdf-core root
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

if [ -z "$USE_EXISTING_VPC" ]; then
    # if private api auth, or asset library full mode, is configured then these will get overwritten
    VPC_ID='N/A'
    CDF_SECURITY_GROUP_ID='N/A'
    PRIVATE_SUBNET_IDS='N/A'
    PRIVATE_ENDPOINT_ID='N/A'
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
*****   Connected Device Framework                  ******
**********************************************************

The Connected Device Framework (CDF) will install using the following configuration:

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

    -m (ASSETLIBRARY_MODE)              : $ASSETLIBRARY_MODE
    -i (BASTION_REMOTE_ACCESS_CIDR)     : $BASTION_REMOTE_ACCESS_CIDR
    -x (CONCURRENT_EXECUTIONS):         : $CONCURRENT_EXECUTIONS
    -s (APPLY_AUTOSCALING):             : $APPLY_AUTOSCALING

    -N (USE_EXISTING_VPC)               : $USE_EXISTING_VPC"

if [[ -z "$USE_EXISTING_VPC" ]]; then
    config_message+='not provided, therefore a new vpc will be created'
else
    config_message+="
    -v (VPC_ID)                         : $VPC_ID
    -g (CDF_SECURITY_GROUP_ID)       : $CDF_SECURITY_GROUP_ID
    -n (PRIVATE_SUBNET_IDS)             : $PRIVATE_SUBNET_IDS
    -o (PUBLIC_SUBNET_IDS)              : $PUBLIC_SUBNET_IDS
    -r (PRIVATE_ROUTE_TABLE_IDS)        : $PRIVATE_ROUTE_TABLE_IDS"
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
CERTIFICATEVENDOR_STACK_NAME=cdf-certificatevendor-${ENVIRONMENT}
COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}
DEVICE_MONITORING_STACK_NAME=cdf-device-monitoring-${ENVIRONMENT}
EVENTSALERTS_STACK_NAME=cdf-eventsAlerts-${ENVIRONMENT}
EVENTSPROCESSOR_STACK_NAME=cdf-eventsProcessor-${ENVIRONMENT}
NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}
NETWORK_STACK_NAME=cdf-network-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
OPENSSL_LAYER_STACK_NAME=cdf-openssl-${ENVIRONMENT}


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


logTitle 'Uploading Cloudformation template snippets'

for snippet in $(ls "$root_dir"/infrastructure/cloudformation/snippets/*); do
    key="$TEMPLATE_SNIPPET_S3_URI_BASE"$(basename "$snippet")
    aws s3 cp "$snippet" "$key" $AWS_ARGS
done



logTitle 'Configuring KMS key'
if [ -z "$KMS_KEY_ID" ]; then
    echo '
No KMS_KEY_ID provided, therefore creating one.
'
    keys=$(aws kms create-key --description 'CDF encryption key' $AWS_ARGS)
    KMS_KEY_ID=$(echo "$keys" | jq -r '.KeyMetadata.KeyId')
    echo "Created KMS Key Id: $KMS_KEY_ID"
else
    echo '
Reusing existing KMS Key.
'

fi

assetlibrary_config=$CONFIG_LOCATION/assetlibrary/$CONFIG_ENVIRONMENT-config.json
if [[ -f $assetlibrary_config && "$ASSETLIBRARY_MODE" = "full" && -z "$USE_EXISTING_VPC" ]] || [[ "$API_GATEWAY_AUTH" == "Private"  ]]; then

    logTitle 'Deploying Networking'

    cd "$root_dir/infrastructure"

    aws cloudformation deploy \
        --template-file cloudformation/cfn-networking.yaml \
        --stack-name "$NETWORK_STACK_NAME" --no-fail-on-empty-changeset \
        $AWS_ARGS

    stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

    vpc_id_export="$NETWORK_STACK_NAME-VPC"
    VPC_ID=$(echo "$stack_exports" \
        | jq -r --arg vpc_id_export "$vpc_id_export" \
        '.Exports[] | select(.Name==$vpc_id_export) | .Value')

    vpce_id_export="$NETWORK_STACK_NAME-PrivateApiGatewayVPCEndpoint"
    VPCE_ID=$(echo "$stack_exports" \
        | jq -r --arg vpce_id_export "$vpce_id_export" \
        '.Exports[] | select(.Name==$vpce_id_export) | .Value')

    cdf_security_group_id_export="$NETWORK_STACK_NAME-SecurityGroup"
    CDF_SECURITY_GROUP_ID=$(echo "$stack_exports" \
        | jq -r --arg cdf_security_group_id_export "$cdf_security_group_id_export" \
        '.Exports[] | select(.Name==$cdf_security_group_id_export) | .Value')

    private_subnet_1_id_export="$NETWORK_STACK_NAME-PrivateSubnetOne"
    private_subnet_1_id=$(echo "$stack_exports" \
        | jq -r --arg private_subnet_1_id_export "$private_subnet_1_id_export" \
        '.Exports[] | select(.Name==$private_subnet_1_id_export) | .Value')

    private_subnet_2_id_export="$NETWORK_STACK_NAME-PrivateSubnetTwo"
    private_subnet_2_id=$(echo "$stack_exports" \
        | jq -r --arg private_subnet_2_id_export "$private_subnet_2_id_export" \
        '.Exports[] | select(.Name==$private_subnet_2_id_export) | .Value')

    PRIVATE_SUBNET_IDS="$private_subnet_1_id,$private_subnet_2_id"

    public_subnet_1_id_export="$NETWORK_STACK_NAME-PublicSubnetOne"
    public_subnet_1_id=$(echo "$stack_exports" \
        | jq -r --arg public_subnet_1_id_export "$public_subnet_1_id_export" \
        '.Exports[] | select(.Name==$public_subnet_1_id_export) | .Value')

    public_subnet_2_id_export="$NETWORK_STACK_NAME-PublicSubnetTwo"
    public_subnet_2_id=$(echo "$stack_exports" \
        | jq -r --arg public_subnet_2_id_export "$public_subnet_2_id_export" \
        '.Exports[] | select(.Name==$public_subnet_2_id_export) | .Value')

    PUBLIC_SUBNET_IDS="$public_subnet_1_id,$public_subnet_2_id"

    private_routetable_1_id_export="$NETWORK_STACK_NAME-PrivateRouteTableOne"
    private_routetable_1_id=$(echo "$stack_exports" \
        | jq -r --arg private_routetable_1_id_export "$private_routetable_1_id_export" \
        '.Exports[] | select(.Name==$private_routetable_1_id_export) | .Value')

    private_routetable_2_id_export="$NETWORK_STACK_NAME-PrivateRouteTableTwo"
    private_routetable_2_id=$(echo "$stack_exports" \
        | jq -r --arg private_routetable_2_id_export "$private_routetable_2_id_export" \
        '.Exports[] | select(.Name==$private_routetable_2_id_export) | .Value')

    PRIVATE_ROUTE_TABLE_IDS="$private_routetable_1_id,$private_routetable_2_id"

fi


logTitle 'Deploying lambda layers'
lambda_layers_root="$root_dir/infrastructure/lambdaLayers"
for layer in $(ls $lambda_layers_root); do
    cd "$lambda_layers_root/$layer"
    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT $AWS_SCRIPT_ARGS
done

logTitle 'Deploying services'

cognito_auth_arg=
if [ "$API_GATEWAY_AUTH" = "Cognito" ]; then
    cognito_auth_arg="-C ${COGNTIO_USER_POOL_ARN}"
fi

lambda_invoker_auth_arg=
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    lambda_invoker_auth_arg="-A ${AUTHORIZER_FUNCTION_ARN}"
fi

if [ -f "$assetlibrary_config" ]; then

    logTitle 'Deploying Asset Library'

    cd "$root_dir/packages/services/assetlibrary"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS

    # TODO: refactor
    assetlibrary_concurrent_executions_arg=
    if [ -n "$CONCURRENT_EXECUTIONS" ]; then
        assetlibrary_concurrent_executions_arg="-x $CONCURRENT_EXECUTIONS"
    fi

    assetlibrary_autoscaling_arg=
    if [ "$APPLY_AUTOSCALING" = "true" ]; then
        assetlibrary_autoscaling_arg="-s"
    fi

    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$assetlibrary_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" -r "$PRIVATE_ROUTE_TABLE_IDS" \
        -m "$ASSETLIBRARY_MODE" \
        $assetlibrary_concurrent_executions_arg $assetlibrary_autoscaling_arg \
        $AWS_SCRIPT_ARGS

    asset_library_deployed="true"


    if [ "$ASSETLIBRARY_MODE" = "full" ]; then

        logTitle 'Deploying Bastion'

        cd "$root_dir/infrastructure"

        aws cloudformation deploy \
        --template-file cloudformation/cfn-bastion-host.yaml \
        --stack-name "$BASTION_STACK_NAME" \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            VPCID="$VPC_ID" \
            PublicSubNetIds="$PUBLIC_SUBNET_IDS" \
            KeyPairName="$KEY_PAIR_NAME" \
            RemoteAccessCIDR="$BASTION_REMOTE_ACCESS_CIDR" \
            EnableTCPForwarding=true \
            CDFSecurityGroupId=$CDF_SECURITY_GROUP_ID \
        --no-fail-on-empty-changeset \
        --capabilities CAPABILITY_IAM \
        $AWS_ARGS

    fi
fi

provisioning_config=$CONFIG_LOCATION/provisioning/$CONFIG_ENVIRONMENT-config.json
if [ -f "$provisioning_config" ]; then

    logTitle 'Deploying provisioning'

    cd "$root_dir/packages/services/provisioning"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$provisioning_config" -k "$KMS_KEY_ID" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        -o $OPENSSL_LAYER_STACK_NAME $AWS_SCRIPT_ARGS


    logTitle 'Uploading provisioning templates'

    template_bucket=$(cat "$provisioning_config" | jq -r '.aws.s3.templates.bucket')
    template_prefix=$(cat "$provisioning_config" | jq -r '.aws.s3.templates.prefix')

    for template in $(ls "$CONFIG_LOCATION"/provisioning/templates/*); do
        key=s3://"$template_bucket"/"$template_prefix"$(basename "$template")
        aws s3 cp "$template" "$key" $AWS_ARGS
    done


    logTitle 'Creating AWS IoT policies'

    for policy in $(ls "$CONFIG_LOCATION"/provisioning/iot-policies/*); do
        policyName="$(basename "$policy" .json)"
        policyDocument=$(sed -e "s/\${cdf:region}/$AWS_REGION/" -e "s/\${cdf:accountId}/$AWS_ACCOUNT_ID/" "$policy")

        # see how many policy versions already exist
        existing_version_count=$(aws iot list-policy-versions \
            --policy-name "$policyName" $AWS_ARGS \
                | jq '.policyVersions | length' \
                || true )

        if [ "$existing_version_count" = "" ]; then
            existing_version_count=0
        fi

        # if we have hit the limit, we need to remove one before creating a new version
        if [ $existing_version_count -ge 5 ]; then        
            earliest_existing_version_id=$(aws iot list-policy-versions \
                --policy-name "$policyName" $AWS_ARGS \
                    | jq -r '.policyVersions[4].versionId' \
                    || true)
            aws iot delete-policy-version \
                --policy-name "$policyName" \
                --policy-version-id "$earliest_existing_version_id" \
                $AWS_ARGS
        fi

        # if we have an existing version, create a new version, if not create a new policy
        if [ $existing_version_count -gt 0 ]; then     
            aws iot create-policy-version \
            --policy-name "$policyName" \
            --policy-document "$policyDocument" \
            --set-as-default \
            $AWS_ARGS
        else
            aws iot create-policy \
                --policy-name "$policyName" \
                --policy-document "$policyDocument" \
                $AWS_ARGS
        fi 

    done

      logTitle 'Creating AWS IoT Types'

      if [ -f "$CONFIG_LOCATION"/provisioning/iot-types/* ]; then

        for type in $(ls "$CONFIG_LOCATION"/provisioning/iot-types/*); do
          typeName="$(basename "$type" .json)"
          typeDescription=$(cat $type | jq -r '.thingTypeDescription')
          typeSearchableAttributes=$(cat $type | jq -r '.searchableAttributes | @csv' | tr -d '"')

          typeProperties="thingTypeDescription=$typeDescription"

          if [ -n "$typeSearchableAttributes" ]; then
             typeProperties+=", searchableAttributes=$typeSearchableAttributes"
          fi

          aws iot create-thing-type \
            --thing-type-name $typeName \
            --thing-type-properties "$typeProperties" \
            $AWS_ARGS || true
        done
      fi

else
   echo 'NOT DEPLOYING: provisioning'
fi

commands_config=$CONFIG_LOCATION/commands/$CONFIG_ENVIRONMENT-config.json
if [ -f "$commands_config" ]; then

    logTitle 'Deploying commands'

    cd "$root_dir/packages/services/commands"

    commands_bucket=$(cat "$commands_config" | jq -r '.aws.s3.bucket')

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$commands_config" -f "$commands_bucket" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: commands'
fi

devicemonitoring_config=$CONFIG_LOCATION/devicemonitoring/$CONFIG_ENVIRONMENT-config.json
if [ -f "$devicemonitoring_config" ]; then

    logTitle 'Deploying device monitoring'

    cd "$root_dir/packages/services/device-monitoring"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$devicemonitoring_config" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: device monitoring'
fi


eventsprocessor_config=$CONFIG_LOCATION/events-processor/$CONFIG_ENVIRONMENT-config.json
if [ -f "$eventsprocessor_config" ]; then

    logTitle 'Deploying events processor'

    cd "$root_dir/packages/services/events-processor"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$eventsprocessor_config" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: events-processor'
fi



certificatevendor_config=$CONFIG_LOCATION/certificatevendor/$CONFIG_ENVIRONMENT-config.json
if [ -f "$certificatevendor_config" ]; then

    logTitle 'Deploying certificate vendor'

    cd "$root_dir/packages/services/certificatevendor"

    certificatevendor_bucket=$(cat "$certificatevendor_config" | jq -r '.aws.s3.certificates.bucket')
    certificatevendor_prefix=$(cat "$certificatevendor_config" | jq -r '.aws.s3.certificates.prefix')

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$certificatevendor_config" -b "$certificatevendor_bucket" -p "$certificatevendor_prefix" \
        -r AssetLibrary -k "$KMS_KEY_ID" \
        -o $OPENSSL_LAYER_STACK_NAME $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: certificate vendor'
fi

bulkcerts_config=$CONFIG_LOCATION/bulkcerts/$CONFIG_ENVIRONMENT-config.json
if [ -f "$bulkcerts_config" ]; then

    logTitle 'Deploying bulkcerts'

    cd "$root_dir/packages/services/bulkcerts"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$bulkcerts_config" -k "$KMS_KEY_ID" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        -o $OPENSSL_LAYER_STACK_NAME $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: bulk certs'
fi


eventsalerts_config=$CONFIG_LOCATION/events-alerts/$CONFIG_ENVIRONMENT-config.json
if [ -f "$eventsalerts_config" ]; then

    logTitle 'Deploying events alerts'

    cd "$root_dir/packages/services/events-alerts"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$eventsalerts_config" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: events alerts'
fi



assetlibraryhistory_config=$CONFIG_LOCATION/assetlibraryhistory/$CONFIG_ENVIRONMENT-config.json
if [ -f "$assetlibraryhistory_config" ]; then

    logTitle 'Deploying asset library history'

    cd "$root_dir/packages/services/assetlibraryhistory"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "$assetlibraryhistory_config" -t 'cdf/assetlibrary/events/#' \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: asset library history'
fi



greengrassProvisioning_config=$CONFIG_LOCATION/greengrass-provisioning/$CONFIG_ENVIRONMENT-config.json
if [ -f "greengrassProvisioning_config" ]; then

    logTitle 'Deploying Greengrass Provisioning'

    cd "$root_dir/packages/services/greengrass-provisioning"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "greengrassProvisioning_config"  \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: Greengrass Provisioning'
fi



greengrassDeployment_config=$CONFIG_LOCATION/greengrass-deployment/$CONFIG_ENVIRONMENT-config.json
if [ -f "greengrassDeployment_config" ]; then

    logTitle 'Deploying Greengrass Deployment'

    cd "$root_dir/packages/services/greengrass-deployment"

    infrastructure/package-cfn.bash -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" $AWS_SCRIPT_ARGS
    infrastructure/deploy-cfn.bash -e "$ENVIRONMENT" -c "greengrassDeployment_config" -b "$DEPLOY_ARTIFACTS_STORE_BUCKET" \
        -y "$TEMPLATE_SNIPPET_S3_URI_BASE" -z "$API_GATEWAY_DEFINITION_TEMPLATE" \
        -a "$API_GATEWAY_AUTH" $cognito_auth_arg $lambda_invoker_auth_arg \
        -v "$VPC_ID" -g "$CDF_SECURITY_GROUP_ID" -n "$PRIVATE_SUBNET_IDS" -i "$VPCE_ID" \
        $AWS_SCRIPT_ARGS
else
   echo 'NOT DEPLOYING: Greengrass Deployment'
fi

logTitle 'CDF deployment complete!'
