#!/bin/bash

set -e

function help_message {
    cat << EOF

NAME

    deploy-core.bash    

DESCRIPTION

    Deploys the CDF core services.

MANDATORY ARGUMENTS:

    -e (string)   Name of environment.
    -c (string)   Location of infrastructure project containing CDF application configuration.

OPTIONAL ARGUMENTS

    -E (string)   Name of configuration environment.  If not provided, then '-e ENVIRONMENT' is used.
    -p (string)   The name of the key pair to use to deploy the Bastion EC2 host.
    -i (string)   The remote access CIDR to configure Bastion SSH access (e.g. 1.2.3.4/32).
    -b (string)   The name of the S3 bucket to deploy CloudFormation templates into.  If not provided, a new bucket named 'cdf-cfn-artifacts-$AWS_ACCOUNT_ID-$AWS_REGION' is created.
    -k (string)   The KMS Key id that the provisoning service will use to decrypt sensitive information.  If not provided, a new KMS key with the alias 'cdf' is created.

    -m (string)   Asset Library mode ('full' or 'lite').  Defaults to full if not provided.

    -N (flag)     Use an existing VPC instead of creating a new one
    -v (string)   ID of VPC to deploy into (required if -N set)
    -g (string)   ID of source security group to allow access to Asset Library (required if -N set)
    -n (string)   ID of private subnets (comma delimited) to deploy the AssetLibrar into (required if -N set)
    -o (string)   ID of public subnets (comma delimited) to deploy the Bastion into (required if -N set)
    -r (string)   ID of private route tables (comma delimited) to configure for Asset Library access

    -I (flag)     Bypass running 'npm install' on each checked out project.  If 'npm install' has previously been run, and no changes to dependencies have been made, setting this flag will speed up the deploy.
    -B (flag)     Bypass running 'npm run build' on each checked out project.  If 'npm run build' has previously been run, and no changes to the source code have been made, setting this flag will speed up the deploy.

    -Y (flag)     Proceed with install bypassing the prompt requesting permission continue.
    -R (string)   AWS region.
    -P (string)   AWS profile.

DEPENDENCIES REQUIRED:

    - aws-cli
    - jq
    - zip
    
EOF
}


##########################################################
######  parse and validate the provided arguments   ######
##########################################################

while getopts ":e:E:c:p:i:k:b:Nv:g:n:m:o:r:IBYR:P:" opt; do
  case $opt in
    e  ) ENVIRONMENT=$OPTARG;;
    E  ) CONFIG_ENVIRONMENT=$OPTARG;;
    c  ) CONFIG_LOCATION=$OPTARG;;

    p  ) KEY_PAIR_NAME=$OPTARG;;
    i  ) BASTION_REMOTE_ACCESS_CIDR=$OPTARG;;
    k  ) KMS_KEY_ID=$OPTARG;;
    b  ) DEPLOY_ARTIFACTS_STORE_BUCKET=$OPTARG;;
    m  ) ASSETLIBRARY_MODE=$OPTARG;;

    N  ) USE_EXISTING_VPC=true;;
    v  ) VPC_ID=$OPTARG;;
    g  ) SOURCE_SECURITY_GROUP_ID=$OPTARG;;
    n  ) PRIVATE_SUBNET_IDS=$OPTARG;;
    o  ) PUBLIC_SUBNET_IDS=$OPTARG;;
    r  ) PRIVATE_ROUTE_TABLE_IDS=$OPTARG;;

    I  ) BYPASS_NPM_INSTALL=true;;
    B  ) BYPASS_NPM_BUILD=true;;
    Y  ) BYPASS_PROMPT=true;;

    R  ) AWS_REGION=$OPTARG;;
    P  ) AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done


if [ -z "$ENVIRONMENT" ]; then
	echo -e ENVIRONMENT is required; help_message; exit 1;
fi
if [ -z "$CONFIG_ENVIRONMENT" ]; then
    CONFIG_ENVIRONMENT=$ENVIRONMENT
	echo -E CONFIG_ENVIRONMENT not provided, therefore set to $CONFIG_ENVIRONMENT
fi

if [ -z "$CONFIG_LOCATION" ]; then
	echo -c CONFIG_LOCATION is required; help_message; exit 1;
fi

if [ -n "$USE_EXISTING_VPC" ]; then
    if [ -z "$VPC_ID" ]; then
        echo -v VPC_ID is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$SOURCE_SECURITY_GROUP_ID" ]; then
        echo -g SOURCE_SECURITY_GROUP_ID is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$PRIVATE_SUBNET_IDS" ]; then
        echo -n PRIVATE_SUBNET_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$PUBLIC_SUBNET_IDS" ]; then
        echo -o PUBLIC_SUBNET_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
    if [ -z "$PRIVATE_ROUTE_TABLE_IDS" ]; then
        echo -r PRIVATE_ROUTE_TABLE_IDS is required when choosing to use an existing VPC; help_message; exit 1;
    fi
fi

if [ -z "$ASSETLIBRARY_MODE" ]; then
	ASSETLIBRARY_MODE=full
fi
if [[ "$ASSETLIBRARY_MODE" != "lite" && "$ASSETLIBRARY_MODE" != "full" ]]; then
	echo -m ASSETLIBRARY_MODE allowed values: 'full', 'lite'; help_message; exit 1;
fi

if [[ "$ASSETLIBRARY_MODE" = "full" ]]; then
    if [ -z "$KEY_PAIR_NAME" ]; then
        echo -p KEY_PAIR_NAME is required in full mode; help_message; exit 1;
    fi
    if [ -z "$BASTION_REMOTE_ACCESS_CIDR" ]; then
        echo -i BASTION_REMOTE_ACCESS_CIDR is required in full mode; help_message; exit 1;
    fi
fi



AWS_ARGS=
if [ -n "$AWS_REGION" ]; then
	AWS_ARGS="--region $AWS_REGION "
fi
if [ -n "$AWS_PROFILE" ]; then
	AWS_ARGS="$AWS_ARGS--profile $AWS_PROFILE"
fi

if [ -z "$AWS_REGION" ]; then
	AWS_REGION=$(aws configure get region $AWS_ARGS)
fi

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)



##########################################################
######  confirm whether to proceed or not           ######
##########################################################

asksure() {
    echo -n "
**********************************************************
*****   Connected Device Framework                  ******
**********************************************************

The Connected Device Framework (CDF) will install using the following configuration:

    -e (ENVIRONMENT)                    : $ENVIRONMENT
    -E (CONFIG_ENVIRONMENT)             : $CONFIG_ENVIRONMENT
    -c (CONFIG_LOCATION)                : $CONFIG_LOCATION
    -b (DEPLOY_ARTIFACTS_STORE_BUCKET)  : $DEPLOY_ARTIFACTS_STORE_BUCKET
    -p (KEY_PAIR_NAME)                  : $KEY_PAIR_NAME
    -i (BASTION_REMOTE_ACCESS_CIDR)     : $BASTION_REMOTE_ACCESS_CIDR
    -k (KMS_KEY_ID)                     : $KMS_KEY_ID
    -m (ASSETLIBRARY_MODE)              : $ASSETLIBRARY_MODE
    -N (USE_EXISTING_VPC)               : $USE_EXISTING_VPC"

    if [ -z "$USE_EXISTING_VPC" ]; then
        echo -n 'not provided, therefore a new vpc will be created'
    else
        echo "
    -v (VPC_ID)                         : $VPC_ID
    -g (SOURCE_SECURITY_GROUP_ID)       : $SOURCE_SECURITY_GROUP_ID
    -n (PRIVATE_SUBNET_IDS)             : $PRIVATE_SUBNET_IDS
    -o (PUBLIC_SUBNET_IDS)              : $PUBLIC_SUBNET_IDS
    -r (PRIVATE_ROUTE_TABLE_IDS)        : $PRIVATE_ROUTE_TABLE_IDS"
    fi

    echo "
    -R (AWS_REGION)                     : $AWS_REGION
    -P (AWS_PROFILE)                    : $AWS_PROFILE
        AWS_ACCOUNT_ID                  : $AWS_ACCOUNT_ID
    -I (BYPASS_NPM_INSTALL)             : $BYPASS_NPM_INSTALL"

    if [ -z "$BYPASS_NPM_INSTALL" ]; then
        echo -n 'not provided, therefore each TypeScript project will have its dependencies downloaded'
    fi
    
    echo -n "
    -B (BYPASS_NPM_BUILD)               : $BYPASS_NPM_BUILD"
    if [ -z "$BYPASS_NPM_BUILD" ]; then
        echo -n 'not provided, therefore each TypeScript project will be built
'
    fi

    echo '

Are you sure you want to proceed (Y/N)?
'
    while read -r -n 1 -s answer; do
        if [[ $answer = [YyNn] ]]; then
            [[ $answer = [Yy] ]] && retval=0
            [[ $answer = [Nn] ]] && retval=1
            break
        fi
    done
    return $retval
}

if [ -z "$BYPASS_PROMPT" ]; then
    if asksure; then
    echo "Okay, installation of CDF will continue....
    "
    else
    echo "Installation of CDF aborted"
    exit 1
    fi
fi


root_dir=$(pwd)

######################################################################
######  stack names                                             ######
######################################################################

NETWORK_STACK_NAME=cdf-network-${ENVIRONMENT}
NEPTUNE_STACK_NAME=cdf-assetlibrary-neptune-${ENVIRONMENT}
ASSETLIBRARY_STACK_NAME=cdf-assetlibrary-${ENVIRONMENT}
BASTION_STACK_NAME=cdf-bastion-${ENVIRONMENT}
PROVISIONING_STACK_NAME=cdf-provisioning-${ENVIRONMENT}
COMMANDS_STACK_NAME=cdf-commands-${ENVIRONMENT}
AUTH_DEVICECERT_STACK_NAME=cdf-auth-devicecert-${ENVIRONMENT}
DEVICE_MONITORING_STACK_NAME=cdf-device-monitoring-${ENVIRONMENT}
BULKCERTS_STACK_NAME=cdf-bulkcerts-${ENVIRONMENT}


if [ -z "$BYPASS_NPM_INSTALL" ]; then
    echo '
**********************************************************
*****  Downloading application dependencies         ******
**********************************************************
'
    pnpm i
fi



if [ -z "$BYPASS_NPM_BUILD" ]; then
    echo '
**********************************************************
*****  Building the applications                    ******
**********************************************************
'
    pnpm m run build
fi



echo '
**********************************************************
*****   Configuring S3 Deployment bucket            ******
**********************************************************
'
if [ -z "$DEPLOY_ARTIFACTS_STORE_BUCKET" ]; then
    DEPLOY_ARTIFACTS_STORE_BUCKET="cdf-cfn-artifacts-$AWS_ACCOUNT_ID-$AWS_REGION"
fi

if [ "$AWS_REGION" = "us-east-1" ]; then
    aws s3api create-bucket --bucket $DEPLOY_ARTIFACTS_STORE_BUCKET $AWS_ARGS &
else
    aws s3api create-bucket --bucket $DEPLOY_ARTIFACTS_STORE_BUCKET --create-bucket-configuration LocationConstraint=$AWS_REGION $AWS_ARGS &
fi



echo '
**********************************************************
*****   Configuring KMS key                         ******
**********************************************************
'
if [ -z "$KMS_KEY_ID" ]; then
    echo '
No KMS_KEY_ID provided, therefore creating one.
'
    keys=$(aws kms create-key --description 'CDF encryption key' $AWS_ARGS)
    KMS_KEY_ID=$(echo $keys | jq -r '.KeyMetadata.KeyId')
    echo "Created KMS Key Id: $KMS_KEY_ID"
fi


echo '
**********************************************************
*****   Deploying Networking                        ******
**********************************************************
'

assetlibrary_config=$CONFIG_LOCATION/assetlibrary/$CONFIG_ENVIRONMENT-config.json
if [[ -f $assetlibrary_config && "$ASSETLIBRARY_MODE" = "full" && -z "$USE_EXISTING_VPC" ]]; then

    cd "$root_dir/infrastructure"

    aws cloudformation deploy \
        --template-file cfn-networking.yaml \
        --stack-name $NETWORK_STACK_NAME --no-fail-on-empty-changeset \
        $AWS_ARGS

    stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

    vpc_id_export="$NETWORK_STACK_NAME-VPC"
    VPC_ID=$(echo $stack_exports \
        | jq -r --arg vpc_id_export "$vpc_id_export" \
        '.Exports[] | select(.Name==$vpc_id_export) | .Value')

    source_security_group_id_export="$NETWORK_STACK_NAME-DefaultSecurityGroup"
    SOURCE_SECURITY_GROUP_ID=$(echo $stack_exports \
        | jq -r --arg source_security_group_id_export "$source_security_group_id_export" \
        '.Exports[] | select(.Name==$source_security_group_id_export) | .Value')

    private_subnet_1_id_export="$NETWORK_STACK_NAME-PrivateSubnetOne"
    private_subnet_1_id=$(echo $stack_exports \
        | jq -r --arg private_subnet_1_id_export "$private_subnet_1_id_export" \
        '.Exports[] | select(.Name==$private_subnet_1_id_export) | .Value')

    private_subnet_2_id_export="$NETWORK_STACK_NAME-PrivateSubnetTwo"
    private_subnet_2_id=$(echo $stack_exports \
        | jq -r --arg private_subnet_2_id_export "$private_subnet_2_id_export" \
        '.Exports[] | select(.Name==$private_subnet_2_id_export) | .Value')

    PRIVATE_SUBNET_IDS="$private_subnet_1_id,$private_subnet_2_id"

    public_subnet_1_id_export="$NETWORK_STACK_NAME-PublicSubnetOne"
    public_subnet_1_id=$(echo $stack_exports \
        | jq -r --arg public_subnet_1_id_export "$public_subnet_1_id_export" \
        '.Exports[] | select(.Name==$public_subnet_1_id_export) | .Value')

    public_subnet_2_id_export="$NETWORK_STACK_NAME-PublicSubnetTwo"
    public_subnet_2_id=$(echo $stack_exports \
        | jq -r --arg public_subnet_2_id_export "$public_subnet_2_id_export" \
        '.Exports[] | select(.Name==$public_subnet_2_id_export) | .Value')

    PUBLIC_SUBNET_IDS="$public_subnet_1_id,$public_subnet_2_id"

    private_routetable_1_id_export="$NETWORK_STACK_NAME-PrivateRouteTableOne"
    private_routetable_1_id=$(echo $stack_exports \
        | jq -r --arg private_routetable_1_id_export "$private_routetable_1_id_export" \
        '.Exports[] | select(.Name==$private_routetable_1_id_export) | .Value')

    private_routetable_2_id_export="$NETWORK_STACK_NAME-PrivateRouteTableTwo"
    private_routetable_2_id=$(echo $stack_exports \
        | jq -r --arg private_routetable_2_id_export "$private_routetable_2_id_export" \
        '.Exports[] | select(.Name==$private_routetable_2_id_export) | .Value')

    PRIVATE_ROUTE_TABLE_IDS="$private_routetable_1_id,$private_routetable_2_id"

fi

stacks=()

if [ -f $assetlibrary_config ]; then

    echo '
    **********************************************************
    *****  Deploying  assetlibrary                      ******
    **********************************************************
    '

    cd "$root_dir/packages/services/assetlibrary"

    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET -R $AWS_REGION -P $AWS_PROFILE

    if [ "$ASSETLIBRARY_MODE" = "full" ]; then
        infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $assetlibrary_config \
        -m $ASSETLIBRARY_MODE \
        -v $VPC_ID -g $SOURCE_SECURITY_GROUP_ID -n $PRIVATE_SUBNET_IDS -r $PRIVATE_ROUTE_TABLE_IDS \
        -R $AWS_REGION -P $AWS_PROFILE &
    else
        infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $assetlibrary_config \
        -m $ASSETLIBRARY_MODE \
        -R $AWS_REGION -P $AWS_PROFILE &
    fi


    if [ "$ASSETLIBRARY_MODE" = "full" ]; then

        echo '
        **********************************************************
        *****   Deploying Bastion                           ******
        **********************************************************
        '

        cd "$root_dir/infrastructure"

        aws cloudformation deploy \
        --template-file cfn-bastion-host.yaml \
        --stack-name $BASTION_STACK_NAME \
        --parameter-overrides \
            Environment=$ENVIRONMENT \
            VpcId=$VPC_ID \
            PublicSubNetIds=$PUBLIC_SUBNET_IDS \
            KeyPairName=$KEY_PAIR_NAME \
            RemoteAccessCIDR=$BASTION_REMOTE_ACCESS_CIDR \
            EnableTCPForwarding=true \
        --capabilities CAPABILITY_IAM \
        $AWS_ARGS &

        stacks+=($BASTION_STACK_NAME)
    fi

    stacks+=($ASSETLIBRARY_STACK_NAME)
fi


provisioning_config=$CONFIG_LOCATION/provisioning/$CONFIG_ENVIRONMENT-config.json
if [ -f $provisioning_config ]; then

    echo '
    **********************************************************
    *****  Deploying provisioning                       ******
    **********************************************************
    '

    cd "$root_dir/packages/services/provisioning"

    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET -R $AWS_REGION -P $AWS_PROFILE
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $provisioning_config -k $KMS_KEY_ID \
    -R $AWS_REGION -P $AWS_PROFILE &

    stacks+=($PROVISIONING_STACK_NAME)

    echo '
    **********************************************************
    *****  Uploading provisioning templates             ******
    **********************************************************
    '

    template_bucket=$(cat $provisioning_config | jq -r '.aws.s3.templates.bucket')
    template_prefix=$(cat $provisioning_config | jq -r '.aws.s3.templates.prefix')

    for template in $(ls $CONFIG_LOCATION/provisioning/templates/*); do
        key="s3://$template_bucket/$template_prefix$(basename $template)"
        aws s3 cp $template $key $AWS_ARGS &
    done


    echo '
    **********************************************************
    *****  Creating AWS IoT policies                    ******
    **********************************************************
    '

    for policy in $(ls $CONFIG_LOCATION/provisioning/iot-policies/*); do
        policyName="$(basename $policy .json)"
        policyDocument=$(sed -e "s/\${cdf:region}/$AWS_REGION/" -e "s/\${cdf:accountId}/$AWS_ACCOUNT_ID/" $policy)

        # see how many policy versions already exist
        existing_version_count=$(aws iot list-policy-versions \
            --policy-name $policyName $AWS_ARGS \
                | jq '.policyVersions | length' \
                || true )

        if [ "$existing_version_count" = "" ]; then
            existing_version_count=0
        fi

        # if we have hit the limit, we need to remove one before creating a new version
        if [ $existing_version_count -ge 5 ]; then        
            earliest_existing_version_id=$(aws iot list-policy-versions \
                --policy-name $policyName $AWS_ARGS \
                    | jq -r '.policyVersions[4].versionId' \
                    || true)
            aws iot delete-policy-version \
                --policy-name $policyName \
                --policy-version-id $earliest_existing_version_id \
                $AWS_ARGS
        fi

        # if we have an existing version, create a new version, if not create a new policy
        if [ $existing_version_count -gt 0 ]; then     
            aws iot create-policy-version \
            --policy-name $policyName \
            --policy-document "$policyDocument" \
            --set-as-default \
            $AWS_ARGS &
        else
            aws iot create-policy \
                --policy-name $policyName \
                --policy-document "$policyDocument" \
                $AWS_ARGS &
        fi 

    done
fi

commands_config=$CONFIG_LOCATION/commands/$CONFIG_ENVIRONMENT-config.json
if [ -f $commands_config ]; then

    echo '
    **********************************************************
    *****  Deploying commands                           ******
    **********************************************************
    '

    cd "$root_dir/packages/services/commands"

    commands_bucket=$(cat $commands_config | jq -r '.aws.s3.bucket')

    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET -R $AWS_REGION -P $AWS_PROFILE
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $commands_config -f $commands_bucket \
    -R $AWS_REGION -P $AWS_PROFILE &

    stacks+=($COMMANDS_STACK_NAME)

fi

devicemonitoring_config=$CONFIG_LOCATION/devicemonitoring/$CONFIG_ENVIRONMENT-config.json
if [ -f $devicemonitoring_config ]; then

    echo '
    **********************************************************
    *****  Deploying device monitoring                  ******
    **********************************************************
    '

    cd "$root_dir/packages/services/device-monitoring"

    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET -R $AWS_REGION -P $AWS_PROFILE
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $devicemonitoring_config \
    -R $AWS_REGION -P $AWS_PROFILE &

    stacks+=($DEVICE_MONITORING_STACK_NAME)

fi

echo '
**********************************************************
*****  Waiting for deployments to finish            ******
**********************************************************
'
wait


echo '
**********************************************************
*****  Checking status of deployments               ******
**********************************************************
'
failed=false
for stack in ${stacks[@]}; do
    deploy_status=$(aws cloudformation describe-stacks \
        --stack-name $stack $AWS_ARGS\
        | jq -r '.Stacks[0].StackStatus' \
        || true)
    echo "$stack: $deploy_status"
    if [ "$deploy_status" != "CREATE_COMPLETE" -a "$deploy_status" != "UPDATE_COMPLETE" -a "$deploy_status" != "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS" ]; then
        echo "Deploy of $stack failed ($deploy_status).  Check CloudFormation for details."
        failed=true
        break
    fi
done

if [ "$failed" = "true" ]; then
    exit 1
fi


if [ "$ASSETLIBRARY_MODE" = "full" ]; then
    echo '
    **********************************************************
    *****   Adding Bastion security group to the        ******
    *****   Neptune security group                      ******
    **********************************************************
    '

    stack_exports=$(aws cloudformation list-exports $AWS_ARGS)

    bastion_sg_id_export="$BASTION_STACK_NAME-BastionSecurityGroupID"
    bastion_sg_id=$(echo $stack_exports \
        | jq -r --arg bastion_sg_id_export "$bastion_sg_id_export" \
        '.Exports[] | select(.Name==$bastion_sg_id_export) | .Value')

    neptune_sg_id_export="$NEPTUNE_STACK_NAME-NeptuneSecurityGroupID"
    neptune_sg_id=$(echo $stack_exports \
        | jq -r --arg neptune_sg_id_export "$neptune_sg_id_export" \
        '.Exports[] | select(.Name==$neptune_sg_id_export) | .Value')

    aws ec2 authorize-security-group-ingress \
    --group-id $neptune_sg_id \
    --protocol tcp --port 8182 --source-group $bastion_sg_id \
    $AWS_ARGS &
fi

stacks=()

bulkcerts_config=$CONFIG_LOCATION/bulkcerts/$CONFIG_ENVIRONMENT-config.json
if [ -f $bulkcerts_config ]; then

    echo '
    **********************************************************
    *****  Deploying bulkcerts                          ******
    **********************************************************
    '

    cd "$root_dir/packages/services/bulkcerts"

    infrastructure/package-cfn.bash -b $DEPLOY_ARTIFACTS_STORE_BUCKET -R $AWS_REGION -P $AWS_PROFILE
    infrastructure/deploy-cfn.bash -e $ENVIRONMENT -c $bulkcerts_config -k $KMS_KEY_ID \
    -R $AWS_REGION -P $AWS_PROFILE &

    stacks+=($BULKCERTS_STACK_NAME)

fi


echo '
**********************************************************
*****  Waiting for deployments to finish            ******
**********************************************************
'
wait


echo '
**********************************************************
*****  Checking status of deployments               ******
**********************************************************
'
failed=false
for stack in ${stacks[@]}; do
    deploy_status=$(aws cloudformation describe-stacks \
        --stack-name $stack $AWS_ARGS\
        | jq -r '.Stacks[0].StackStatus' \
        || true)
    echo "$stack: $deploy_status"
    if [ "$deploy_status" != "CREATE_COMPLETE" -a "$deploy_status" != "UPDATE_COMPLETE" -a "$deploy_status" != "UPDATE_COMPLETE_CLEANUP_IN_PROGRESS" ]; then
        echo "Deploy of $stack failed ($deploy_status).  Check CloudFormation for details."
        failed=true
        break
    fi
done

if [ "$failed" = "true" ]; then
    exit 1
fi


echo '
**********************************************************
*****  Done!                                        ******
**********************************************************
'
