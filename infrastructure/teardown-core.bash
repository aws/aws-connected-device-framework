#!/bin/bash

set -e
# path is from cdf-core root
source ./common-deploy-functions.bash

function help_message {
    cat << EOF

NAME

    teardown-core.bash

DESCRIPTION

    Tear down the CDF core services.

MANDATORY ARGUMENTS:

    -e (string)   Name of environment.

OPTIONAL ARGUMENTS

    -D (flag)     Enable debug mode.
    -R (string)   AWS region.
    -P (string)   AWS profile.

DEPENDENCIES REQUIRED:

    - aws-cli
    - jq
    
EOF
}


#-------------------------------------------------------------------------------
# Validate all COMMON arguments.  Any SERVICE specific arguments are validated
# by the service specific deployment script.
#-------------------------------------------------------------------------------

while getopts ":e:DR:P:" opt; do
  case $opt in
    e  ) ENVIRONMENT=$OPTARG;;
    D  ) export DEBUG=true;;
    R  ) AWS_REGION=$OPTARG;;
    P  ) AWS_PROFILE=$OPTARG;;

    \? ) echo "Unknown option: -$OPTARG" >&2; help_message; exit 1;;
    :  ) echo "Missing option argument for -$OPTARG" >&2; help_message; exit 1;;
    *  ) echo "Unimplemented option: -$OPTARG" >&2; help_message; exit 1;;
  esac
done

if [[ "$DEBUG" == "true" ]]; then
    set -x
fi


incorrect_args=0

incorrect_args=$((incorrect_args+$(verifyMandatoryArgument ENVIRONMENT e $ENVIRONMENT)))

if [[ "incorrect_args" -gt 0 ]]; then
    help_message; exit 1;
fi

if [ -z "$AWS_REGION" ]; then
	AWS_REGION=$(aws configure get region $AWS_ARGS)
fi

AWS_ARGS=$(buildAwsArgs "$AWS_REGION" "$AWS_PROFILE" )

AWS_ACCOUNT_ID=$(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)



##########################################################
######  confirm whether to proceed or not           ######
##########################################################

config_message="
**********************************************************
*****   Connected Device Framework                  ******
**********************************************************

The Connected Device Framework (CDF) will be torn down (taking a brute force approach)
using the following configuration:

    -e (ENVIRONMENT)                    : $ENVIRONMENT
    -R (AWS_REGION)                     : $AWS_REGION
    -P (AWS_PROFILE)                    : $AWS_PROFILE
        AWS_ACCOUNT_ID                  : $AWS_ACCOUNT_ID"


asksure "$config_message" $BYPASS_PROMPT

root_dir=$(pwd)

######################################################################
######  stack names                                             ######
######################################################################

jq_regex="^cdf-.*-${ENVIRONMENT}$"
declare -a stacks_to_delete
stacks_to_delete=$(aws cloudformation list-stacks \
    --stack-status-filter CREATE_COMPLETE ROLLBACK_IN_PROGRESS ROLLBACK_FAILED  ROLLBACK_COMPLETE DELETE_FAILED \
    UPDATE_IN_PROGRESS UPDATE_COMPLETE_CLEANUP_IN_PROGRESS UPDATE_COMPLETE UPDATE_ROLLBACK_IN_PROGRESS \
    UPDATE_ROLLBACK_FAILED UPDATE_ROLLBACK_COMPLETE_CLEANUP_IN_PROGRESS UPDATE_ROLLBACK_COMPLETE REVIEW_IN_PROGRESS \
    $AWS_ARGS \
    | jq -r --arg jq_regex "$jq_regex"  '.StackSummaries[] | select(.StackName|test($jq_regex)) | .StackName' )

config_message="
Ok to delete the following?

${stacks_to_delete}

Before proceeding, note these known issues:
- If a Neptune notebook has been created, you must manually delete the notebook first. Failing to
    carry out this step will cause the cdf-assetlibrary-neptune-* stack delete to fail when attempting
    to delete the security group as it will be associated with an ENI created by Sagemaker for the
    notebook to access the Neptune cluster.
- If any lambdas are configured with provisioned capacity, such as Asset Libary out of the box, the
    cdf-networking-* stack delete may fail due to the inability to delete the CDF security group. This
    is due to ENI's created by lambda autoscaling still being associated with the security groups. These
    will eventually be cleaned up by themselves, but if unable to wait, you will need to manually delete
    the ENI's.
"

asksure "$config_message" $BYPASS_PROMPT

# the bastion and network security groups reference each other.  this will cause dependency
# issues when attempting to delete via cloudformation, therefore must delete the association manually
stack_exports=$(aws cloudformation list-exports $AWS_ARGS)
bastion_sg_export="cdf-bastion-${ENVIRONMENT}-BastionSecurityGroupID"
bastion_sg=$(echo "$stack_exports" \
    | jq -r --arg bastion_sg_export "$bastion_sg_export" \
    '.Exports[] | select(.Name==$bastion_sg_export) | .Value')
neptune_sg_export="cdf-assetlibrary-neptune-${ENVIRONMENT}-NeptuneSecurityGroupID"
neptune_sg=$(echo "$stack_exports" \
    | jq -r --arg neptune_sg_export "$neptune_sg_export" \
    '.Exports[] | select(.Name==$neptune_sg_export) | .Value')

if [[ -n "$neptune_sg" && -n "$bastion_sg" ]]; then
    aws ec2 revoke-security-group-ingress --group-id $neptune_sg --protocol tcp --port 8182 --source-group $bastion_sg $AWS_ARGS
fi

for stack in ${stacks_to_delete[@]}; do
    logTitle "Deleting $stack"
    aws cloudformation delete-stack --stack-name $stack $AWS_ARGS &
done

wait

logTitle 'IMPORTANT NOTE:   Keep an eye on the Cloudformation status. May need multiple runs due to stack inter-dependencies'
