#!/usr/bin/env bash

GROUP_ID=$1
PROVISIONING_BASE_URL=$2

OLDIFS=$IFS

group=$(aws greengrass get-group --group-id $GROUP_ID)
echo -e "\n>>>>>>>>>>>>>>>>>>>> group:"
echo $group | jq '.'

group_ver_id=$(echo $group | jq -r '.LatestVersion')
echo -e "\n>>>>>>>>>>>>>>>>>>>> group_version_id:"
echo $group_ver_id

group_ver=$(aws greengrass get-group-version --group-id $GROUP_ID --group-version-id $group_ver_id)
echo -e "\n>>>>>>>>>>>>>>>>>>>> group version:"
echo $group_ver | jq '.'

core_def_ver_arn=$(echo $group_ver | jq -r '.Definition.CoreDefinitionVersionArn')
device_def_ver_arn=$(echo $group_ver | jq -r '.Definition.DeviceDefinitionVersionArn')

IFS=/
read -a core_def_ver_arn_arr <<< "$core_def_ver_arn"
read -a device_def_ver_arn_arr <<< "$device_def_ver_arn"
IFS=$OLDIFS

core_def_id=${core_def_ver_arn_arr[4]}
core_def_ver_id=${core_def_ver_arn_arr[6]}
echo -e "\n>>>>>>>>>>>>>>>>>>>> core_def_id:"
echo $core_def_id
echo -e "\n>>>>>>>>>>>>>>>>>>>> core_def_ver_id:"
echo $core_def_ver_id

device_def_id=${device_def_ver_arn_arr[4]}
device_def_ver_id=${device_def_ver_arn_arr[6]}
echo -e "\n>>>>>>>>>>>>>>>>>>>> device_def_id:"
echo $device_def_id
echo -e "\n>>>>>>>>>>>>>>>>>>>> device_def_ver_id:"
echo $device_def_ver_id

core_def_ver=$(aws greengrass get-core-definition-version --core-definition-id $core_def_id --core-definition-version-id $core_def_ver_id)
echo -e "\n>>>>>>>>>>>>>>>>>>>> core definition version:"
echo $core_def_ver | jq '.'

if [ -n "$core_def_ver" ]; then

    core_thing_arn=$(echo  $core_def_ver | jq -r '.Definition.Cores[].ThingArn')
    echo -e "\n>>>>>>>>>>>>>>>>>>>> core_thing_arn:"
    echo $core_thing_arn

    IFS=/
    read -a core_thing_arn_arr <<< "$core_thing_arn"
    IFS=$OLDIFS

    thing_name="${core_thing_arn_arr[1]}"
    echo -e "\n>>>>>>>>>>>>>>>>>>>> core thing_name:"
    echo $thing_name

    curl -X DELETE \
      "$PROVISIONING_BASE_URL/things/$thing_name" \
      -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
      -H 'Content-Type: application/vnd.aws-cdf-v1.0+json'

    aws greengrass delete-core-definition --core-definition-id $core_def_id

fi

device_def_ver=$(aws greengrass get-device-definition-version --device-definition-id $device_def_id --device-definition-version-id $device_def_ver_id)
echo -e "\n>>>>>>>>>>>>>>>>>>>> device definition version:"
echo $device_def_ver | jq '.'

if [ -n "$device_def_ver" ]; then

    device_thing_arns=($(echo  $device_def_ver | jq -r '.Definition.Devices[].ThingArn'))
    for arn in "${device_thing_arns[@]}"; do
        echo -e "\n>>>>>>>>>>>>>>>>>>>> device_thing_arn:"
        echo $arn

        IFS=/
        read -a arn_arr <<< "$arn"
        IFS=$OLDIFS

        thing_name="${arn_arr[1]}"
        echo -e "\n>>>>>>>>>>>>>>>>>>>> device thing_name:"
        echo $thing_name

        curl -X DELETE \
          "$PROVISIONING_BASE_URL/things/$thing_name" \
          -H 'Accept: application/vnd.aws-cdf-v1.0+json' \
          -H 'Content-Type: application/vnd.aws-cdf-v1.0+json'
    done

    aws greengrass delete-device-definition --device-definition-id $device_def_id
fi

aws greengrass reset-deployments --force --group-id $GROUP_ID

aws greengrass delete-group --group-id $GROUP_ID
