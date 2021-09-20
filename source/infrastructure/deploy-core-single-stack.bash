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
    -b (string)   The name of the S3 bucket to deploy CloudFormation templates and configuration into.
    -y (string)   S3 uri base directory where Cloudformation template snippets are stored.

OPTIONAL ARGUMENTS

    COMMON OPTIONS::
    ----------------
    -E (string)   Name of configuration environment.  If not provided, then '-e ENVIRONMENT' is used.
    -k (string)   The KMS Key id that the provisioning service will use to decrypt sensitive information.  If not provided, a new KMS key with the alias 'cdf' is created.
    -z (string)   Name of API Gateway cloudformation template snippet. If none provided, all API Gateway instances are configured without authentication.

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
    -I (string)   ID of VPC endpoint (required if -N set)
    -r (string)   ID of private route tables (comma delimited) (required if -N set)

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
    -u (string)   The neptune DB instance type

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

while getopts ":e:E:p:i:k:K:I:b:c:a:u:y:z:C:A:Nv:g:n:m:o:r:BYR:P:" opt; do
  case $opt in
    e  ) ENVIRONMENT=$OPTARG;;
    E  ) CONFIG_ENVIRONMENT=$OPTARG;;

    p  ) BASTION_KEYPAIR_NAME=$OPTARG;;
    i  ) BASTION_REMOTE_ACCESS_CIDR=$OPTARG;;
    k  ) KMS_KEY_ID=$OPTARG;;
    b  ) ARTIFACTS_BUCKET=$OPTARG;;
    m  ) ASSETLIBRARY_MODE=$OPTARG;;
    c  ) CDF_INFRA_CONFIG=$OPTARG;;
    u  ) NEPTUNE_INSTANCE_TYPE=$OPTARG;;

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
    I  ) PRIVATE_ENDPOINT_ID=$OPTARG;;

    B  ) BYPASS_BUNDLE=true;;
    Y  ) BYPASS_PROMPT=true;;

    R  ) AWS_REGION=$OPTARG;;
    P  ) AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

cwd=$(dirname "$0")
root_dir=$(pwd)

# path is from aws-connected-device-framework root
source $cwd/common-deploy-functions.bash

incorrect_args=0

DEPLOY_PARAMETERS=()

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))
CONFIG_ENVIRONMENT="$(defaultIfNotSet 'CONFIG_ENVIRONMENT' E ${CONFIG_ENVIRONMENT} ${ENVIRONMENT})"

API_GATEWAY_AUTH="$(defaultIfNotSet 'API_GATEWAY_AUTH' a ${API_GATEWAY_AUTH} 'None')"
incorrect_args=$((incorrect_args+$(verifyApiGatewayAuthType $API_GATEWAY_AUTH)))
if [[ "$API_GATEWAY_AUTH" = "Cognito" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument COGNTIO_USER_POOL_ARN C $COGNTIO_USER_POOL_ARN)))
fi
if [[ "$API_GATEWAY_AUTH" = "LambdaRequest" || "$API_GATEWAY_AUTH" = "LambdaToken" ]]; then
    incorrect_args=$((incorrect_args+$(verifyMandatoryArgument AUTHORIZER_FUNCTION_ARN A $AUTHORIZER_FUNCTION_ARN)))
fi

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ARTIFACTS_BUCKET b "$ARTIFACTS_BUCKET")))
incorrect_args=$((incorrect_args+$(verifyMandatoryArgument TEMPLATE_SNIPPET_S3_URI_BASE y "$TEMPLATE_SNIPPET_S3_URI_BASE")))
API_GATEWAY_DEFINITION_TEMPLATE="$(defaultIfNotSet 'API_GATEWAY_DEFINITION_TEMPLATE' z ${API_GATEWAY_DEFINITION_TEMPLATE} 'cfn-apiGateway-noAuth.yaml')"

ASSETLIBRARY_MODE="$(defaultIfNotSet 'ASSETLIBRARY_MODE' m ${ASSETLIBRARY_MODE} 'full')"
BASTION_REMOTE_ACCESS_CIDR="$(defaultIfNotSet 'BASTION_REMOTE_ACCESS_CIDR' i ${BASTION_REMOTE_ACCESS_CIDR} '0.0.0.0/0')"

DEPLOY_PARAMETERS+=( Environment=$ENVIRONMENT )
DEPLOY_PARAMETERS+=( ArtifactsBucket=$ARTIFACTS_BUCKET )
DEPLOY_PARAMETERS+=( TemplateSnippetS3UriBase=$TEMPLATE_SNIPPET_S3_URI_BASE )
DEPLOY_PARAMETERS+=( AuthType=$API_GATEWAY_AUTH )
DEPLOY_PARAMETERS+=( ApiGatewayDefinitionTemplate=$API_GATEWAY_DEFINITION_TEMPLATE )
DEPLOY_PARAMETERS+=( CognitoUserPoolArn=$COGNTIO_USER_POOL_ARN )
DEPLOY_PARAMETERS+=( AuthorizerFunctionArn=$AUTHORIZER_FUNCTION_ARN )
DEPLOY_PARAMETERS+=( BastionKeyPairName=$BASTION_KEYPAIR_NAME  )
DEPLOY_PARAMETERS+=( BastionRemoteAccessCIDR=$BASTION_REMOTE_ACCESS_CIDR )

if [ ! -z "$CDF_INFRA_CONFIG" ] || [ "$CDF_INFRA_CONFIG" != "" ]; then
    if [ -f "$CDF_INFRA_CONFIG/assetlibrary/$CONFIG_ENVIRONMENT-config.json" ]; then
        assetlibrary_config=$(cat $CDF_INFRA_CONFIG/assetlibrary/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( AssetLibraryAppConfigOverride="$assetlibrary_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeAssetLibrary=false )
    fi

    if [ -f "$CDF_INFRA_CONFIG/assetlibrary-export/$CONFIG_ENVIRONMENT-config.json" ]; then
        assetlibrary_export_config=$(cat $CDF_INFRA_CONFIG/assetlibrary-export/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( AssetLibraryExportAppConfigOverride="$assetlibrary_export_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeAssetLibraryExport=false )
    fi

    if [ -f "$CDF_INFRA_CONFIG/assetlibraryhistory/$CONFIG_ENVIRONMENT-config.json" ]; then
        assetlibrary_history_config=$(cat $CDF_INFRA_CONFIG/assetlibraryhistory/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( AssetLibraryHistoryAppConfigOverride="$assetlibrary_history_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeAssetLibraryHistory=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/commands/$CONFIG_ENVIRONMENT-config.json" ]]; then
        commands_config=$(cat $CDF_INFRA_CONFIG/commands/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( CommandsAppConfigOverride="$commands_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeCommands=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/provisioning/$CONFIG_ENVIRONMENT-config.json" ]]; then
        provisioning_config=$(cat $CDF_INFRA_CONFIG/provisioning/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( ProvisioningAppConfigOverride="$provisioning_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeProvisioning=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/bulkcerts/$CONFIG_ENVIRONMENT-config.json" ]]; then
        bulkcerts_config=$(cat $CDF_INFRA_CONFIG/bulkcerts/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( BulkCertsAppConfigOverride="$bulkcerts_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeBulkCerts=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/devicemonitoring/$CONFIG_ENVIRONMENT-config.json" ]]; then
        devicemonitoring_config=$(cat $CDF_INFRA_CONFIG/devicemonitoring/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( DeviceMonitoringAppConfigOverride="$devicemonitoring_config" )
    else
        DEPLOY_PARAMETERS+=(IncludeDeviceMonitoring=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/simulation-manager/$CONFIG_ENVIRONMENT-config.json" ]]; then
        simulation_manager_config=$(cat $CDF_INFRA_CONFIG/simulation-manager/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( SimulationManagerAppConfigOverride="$simulation_manager_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeSimulationManager=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/simulation-launcher/$CONFIG_ENVIRONMENT-config.json" ]]; then
        simulation_launcher_config=$(cat $CDF_INFRA_CONFIG/simulation-launcher/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( SimulationLauncherAppConfigOverride="$simulation_launcher_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeSimulationLauncher=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/certificatevendor/$CONFIG_ENVIRONMENT-config.json" ]]; then
        certificate_vendor_config=$(cat $CDF_INFRA_CONFIG/certificatevendor/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( CertificateVendorAppConfigOverride="$certificate_vendor_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeCertificateVendor=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/certificateactivator/$CONFIG_ENVIRONMENT-config.json" ]]; then
        certificate_activator_config=$(cat $CDF_INFRA_CONFIG/certificateactivator/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( CertificateActivatorAppConfigOverride="$certificate_activator_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeCertificateActivator=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/events-processor/$CONFIG_ENVIRONMENT-config.json" ]]; then
        events_processor_config=$(cat $CDF_INFRA_CONFIG/events-processor/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( EventsProcessorAppConfigOverride="$events_processor_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeEventProcessor=false )
    fi

    if [[ -f "$CDF_INFRA_CONFIG/events-alerts/$CONFIG_ENVIRONMENT-config.json" ]]; then
        events_alerts_config=$(cat $CDF_INFRA_CONFIG/events-alerts/$CONFIG_ENVIRONMENT-config.json)
        DEPLOY_PARAMETERS+=( EventsAlertsAppConfigOverride="$events_alerts_config" )
    else
        DEPLOY_PARAMETERS+=( IncludeEventAlerts=false )
    fi
fi


if [ "$ASSETLIBRARY_MODE" = "full" ]; then
    if [ -z "$BASTION_KEYPAIR_NAME" ]; then
        echo "ERROR: Deploying AssetLibrary in Full mode; EC2 Keypair Name must be provided"
	    help_message; exit 1;
    fi
fi

# if provided, use existing kms
DEPLOY_PARAMETERS+=( KmsKeyId=$KMS_KEY_ID )

if [ -n "$USE_EXISTING_VPC" ] && [ "$USE_EXISTING_VPC" = 'true' ]; then
    # if private api auth, or asset library full mode, is configured then these will get overwritten
    DEPLOY_PARAMETERS+=( ExistingVpcId=$VPC_ID )
    DEPLOY_PARAMETERS+=( ExistingCDFSecurityGroupId=$CDF_SECURITY_GROUP_ID )
    DEPLOY_PARAMETERS+=( ExistingPrivateSubnetIds=$PRIVATE_SUBNET_IDS )
    DEPLOY_PARAMETERS+=( ExistingPublicSubnetIds=$PUBLIC_SUBNET_IDS )
    DEPLOY_PARAMETERS+=( ExistingPrivateApiGatewayVPCEndpoint=$PRIVATE_ENDPOINT_ID )
    DEPLOY_PARAMETERS+=( ExistingPrivateRouteTableIds=$PRIVATE_ROUTE_TABLE_IDS )
fi

if [ -n "$NEPTUNE_INSTANCE_TYPE" ]; then
  DEPLOY_PARAMETERS+=( NeptuneDbInstanceType=$NEPTUNE_INSTANCE_TYPE )
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
*****   AWS Connected Device Framework Core Config      ******
**********************************************************

The AWS Connected Device Framework (CDF) will install using the following configuration:

    -e (ENVIRONMENT)                     : $ENVIRONMENT
    -E (CONFIG_ENVIRONMENT)              : $CONFIG_ENVIRONMENT
    -d (INFRASTRUCTURE_CONFIGURATION)   : $CDF_INFRA_CONFIG"
if [[ -z "$CDF_INFRA_CONFIG" ]]; then
    config_message+='not provided, therefore deploying all microservices'
fi
    config_message+="
    -y (TEMPLATE_SNIPPET_S3_URI_BASE)    : $TEMPLATE_SNIPPET_S3_URI_BASE
    -z (API_GATEWAY_DEFINITION_TEMPLATE) : $API_GATEWAY_DEFINITION_TEMPLATE

    -a (API_GATEWAY_AUTH)                : $API_GATEWAY_AUTH
    -C (COGNTIO_USER_POOL_ARN)           : $COGNTIO_USER_POOL_ARN
    -A (AUTHORIZER_FUNCTION_ARN)         : $AUTHORIZER_FUNCTION_ARN

    -b (ARTIFACTS_BUCKET)                : $ARTIFACTS_BUCKET
    -p (BASTION_KEYPAIR_NAME)            : $BASTION_KEYPAIR_NAME
    -k (KMS_KEY_ID)                      : $KMS_KEY_ID

    -m (ASSETLIBRARY_MODE)               : $ASSETLIBRARY_MODE
    -i (BASTION_REMOTE_ACCESS_CIDR)      : $BASTION_REMOTE_ACCESS_CIDR

    -N (USE_EXISTING_VPC)                : $USE_EXISTING_VPC"

if [[ -z "$USE_EXISTING_VPC" ]]; then
    config_message+='not provided, therefore a new vpc will be created'
else
    config_message+="
    -v (VPC_ID)                          : $VPC_ID
    -g (CDF_SECURITY_GROUP_ID)           : $CDF_SECURITY_GROUP_ID
    -n (PRIVATE_SUBNET_IDS)              : $PRIVATE_SUBNET_IDS
    -o (PUBLIC_SUBNET_IDS)               : $PUBLIC_SUBNET_IDS
    -I (PRIVATE_ENDPOINT_ID)             : $PRIVATE_ENDPOINT_ID
    -r (PRIVATE_ROUTE_TABLE_IDS)         : $PRIVATE_ROUTE_TABLE_IDS"
fi

config_message+="
    -R (AWS_REGION)                      : $AWS_REGION
    -P (AWS_PROFILE)                     : $AWS_PROFILE
        AWS_ACCOUNT_ID                   : $AWS_ACCOUNT_ID
    -B (BYPASS_BUNDLE)                   : $BYPASS_BUNDLE"

if [ "$BYPASS_BUNDLE" != "true" ]; then
    config_message+='not provided, therefore each TypeScript project will be bundled'
fi

asksure "$config_message" $BYPASS_PROMPT

if [ "$BYPASS_BUNDLE" != "true" ]; then
    logTitle 'Bundling applications'
    rush bundle
fi

mkdir -p $cwd/build

logTitle 'Packaging the aws-connected-device-framework CloudFormation template and uploading to S3'

aws cloudformation package \
  --template-file $cwd/cfn-cdf-core-single-stack.yaml \
  --output-template-file $cwd/build/cfn-cdf-core-single-stack-output.yaml \
  --s3-bucket $ARTIFACTS_BUCKET \
  --s3-prefix packaged-cfn-artifacts \
  $AWS_ARGS

####  Upload the simulation launcher docker container  ####

logTitle 'Deploying Simulation Launcher JMeter Container'

repositoryName="cdf-jmeter-$ENVIRONMENT"
cd "$root_dir/packages/services/simulation-launcher/src/containers/jmeter/infrastructure"
./deploy.bash -b -n $repositoryName $AWS_SCRIPT_ARGS
cd -

DEPLOY_PARAMETERS+=( JMeterRepoName=$repositoryName )

logTitle 'Uploading Cloudformation template snippets'

for snippet in $(ls $cwd/cloudformation/snippets/*); do
    key="$TEMPLATE_SNIPPET_S3_URI_BASE"$(basename "$snippet")
    aws s3 cp "$snippet" "$key" $AWS_ARGS
done

stack_name="cdf-core-$ENVIRONMENT"

echo "DEPLOY PARAMETERS:"
printf "%s\n" "${DEPLOY_PARAMETERS[@]}"

aws cloudformation deploy \
    --stack-name $stack_name \
    --template-file "$cwd/build/cfn-cdf-core-single-stack-output.yaml" \
    --parameter-overrides "${DEPLOY_PARAMETERS[@]}" \
    --capabilities CAPABILITY_NAMED_IAM CAPABILITY_AUTO_EXPAND \
    $AWS_ARGS

logTitle 'CDF deployment complete!'
