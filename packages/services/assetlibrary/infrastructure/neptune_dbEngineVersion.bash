#!/bin/bash

function dbEngineVersion_isAtLeast_help_message {
    cat << EOF

NAME
    neptune_functions.bash dbEngineVersion_isAtLeast

DESCRIPTION
    Determines whether the dbEngineVersion of a deployed AssetLibrary (full mode) Neptune cluster meets a required minimum.

MANDATORY ARGUMENTS:
    -n (string)   Neptune stack name.
    -b (string)   Bastion stack name.
    -k (string)   SSH key file.
    -v (string)   Minimum required Neptune version.

OPTIONAL ARGUMENTS
    -R (string)   AWS region.
    -P (string)   AWS profile.
    
EOF
}

function _get_dbEngineVersion {

      # retrieve the Neptune endpoint
      export stack_exports=$(aws cloudformation list-exports --profile deanhart-1577)
      export dbClusterEndpoint_param=${NEPTUNE_STACK_NAME}-DBClusterEndpoint
      export dbClusterEndpoint=$(echo $stack_exports \
            | jq -r --arg dbClusterEndpoint_param "$dbClusterEndpoint_param" \
            '.Exports[] | select(.Name==$dbClusterEndpoint_param) | .Value')

      if [ -z "$dbClusterEndpoint" ]; then
        echo 'INVALID_NOT_DEPLOYED'
        exit
      fi

      # retrieve the bastion autposcaling group
      export stack_resources=$(aws cloudformation describe-stack-resources --stack-name $BASTION_STACK_NAME --profile deanhart-1577)
      export bastion_autoscaling_group=$(echo $stack_resources | jq -r '.StackResources[] | select(.LogicalResourceId=="BastionAutoScalingGroup") | .PhysicalResourceId')
      
      if [ -z "$bastion_autoscaling_group" ]; then
        echo 'INVALID_NO_BASTION_AUTOSCALING_GROUP'
        exit
      fi

      # retrieve an instance from the group
      export autoscaling_group=$(aws autoscaling describe-auto-scaling-groups --auto-scaling-group-names $bastion_autoscaling_group --profile deanhart-1577)
      export bastion_instanceId=$(echo $autoscaling_group | jq -r '.AutoScalingGroups[0].Instances[0].InstanceId')
      
      if [ -z "$bastion_instanceId" ]; then
        echo 'INVALID_NO_BASTION_INSTANCE'
        exit
      fi

      # retrieve bastion instance details
      export bastion_ip=$(aws ec2 describe-instances --instance-ids $bastion_instance --profile deanhart-1577 | jq -r --arg instanceId "$bastion_instanceId" '.Reservations[].Instances[] | select(.InstanceId==$instanceId) | .PublicIpAddress')
      
      if [ -z "$bastion_ip" ]; then
        echo 'INVALID_NO_BASTION_IP'
        exit
      fi

      # retrieve engine version of an instance via the bastion
      export dbEngineVersion=$(ssh -i $SSH_KEY  ec2-user@$bastion_ip curl -s https://$dbClusterEndpoint:8182/status | jq -r '.dbEngineVersion')
      echo $dbEngineVersion

}

function _vercomp {
    if [[ $1 == $2 ]]; then
        echo '='
        exit
    fi
    local IFS=.
    local i ver1=($1) ver2=($2)
    # fill empty fields in ver1 with zeros
    for ((i=${#ver1[@]}; i<${#ver2[@]}; i++)); do
        ver1[i]=0
    done
    for ((i=0; i<${#ver1[@]}; i++)); do
        if [[ -z ${ver2[i]} ]]; then
            # fill empty fields in ver2 with zeros
            ver2[i]=0
        fi
        if ((10#${ver1[i]} > 10#${ver2[i]})); then
            echo '>'
            exit
        elif ((10#${ver1[i]} < 10#${ver2[i]})); then
            echo '<'
            exit
        fi
    done
    echo '='
}

while getopts ":n:b:k:v:R:P:" opt; do
    case $opt in
        n  ) export NEPTUNE_STACK_NAME=$OPTARG;;
        b  ) export BASTION_STACK_NAME=$OPTARG;;
        k  ) export SSH_KEY=$OPTARG;;
        v  ) export MIN_REQUIRED_VERSION=$OPTARG;;

        R  ) export AWS_REGION=$OPTARG;;
        P  ) export AWS_PROFILE=$OPTARG;;
    esac
done

if [ -z "$NEPTUNE_STACK_NAME" ]; then
    echo 'INVALID_NO_NEPTUNE_STACK_NAME'
    exit
fi

if [ -z "$BASTION_STACK_NAME" ]; then
    echo 'INVALID_NO_BASTION_STACK_NAME'
fi

if [ -z "$SSH_KEY" ]; then
    echo 'INVALID_NO_SSH_KEY'
fi

if [ -z "$MIN_REQUIRED_VERSION" ]; then
    echo 'INVALID_NO_MIN_REQUIRED_VERSION'
fi

current_ver=$(_get_dbEngineVersion)
if [[ $current_ver == INVALID_* ]]; then
    echo $current_ver
    exit 1
fi

compared=$(_vercomp $current_ver $MIN_REQUIRED_VERSION)
echo $compared
case $compared in
    '<'  ) exit 2;;
    '='  ) exit 0;;
    '>'  ) exit 0;;
    *    ) exit '2';;
esac
