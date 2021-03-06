#!/bin/bash
#--------------------------------------------------------------------------------
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
#---------------------------------------------------------------------------------

set -e

function check_type_exists {
    category=$1
    template=$2
    url="/templates/$category/$template"
    body='{}'

    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'GET' "$url" "$body" "$function_name" )
    status_code=$(echo "$response" | jq -r '.statusCode')

    echo "GET $url : $status_code" >&2

    if [[ "$status_code" -eq 404 ]] ; then
        echo 'false'
    else
        echo 'true'
    fi
}

function create_type {
    category=$1
    template=$2
    file=$3

    if [ -z "$file" ]; then
        file=$template
    fi

    url="/templates/$category/$template"
    body="$(cat templates/${file}.json)"

    echo -e "\nCreating $template $category type...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'POST' "$url" "$body" "$function_name" )

    echo "POST $url : $response" >&2
}

function update_type {
    category=$1
    template=$2
    file=$3

    if [ -z "$file" ]; then
        file=$template
    fi

    url="/templates/$category/$template"
    body="$(cat templates/${file}.json)"

    echo -e "\nUpdating $template $category type...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'PATCH' "$url" "$body" "$function_name" )

    echo "PATCH $url : $response" >&2
}

function publish_type {
    category=$1
    template=$2
    url="/templates/$category/$template/publish"
    body='{}'

    echo -e "\nPublishing $template $category type...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'PUT' "$url" "$body" "$function_name" )

    echo "PUT $url : $response" >&2
}

function create_or_update_type {
    category=$1
    template=$2
    file=$3

    if [ -z "$file" ]; then
        file=$template
     fi

    exists="$(check_type_exists ${category} ${template})"
    if [[ "$exists" == 'false' ]]; then
        create_type ${category} ${template} $file
    else
        update_type ${category} ${template} $file
    fi
    publish_type ${category} ${template}
}

function create_bulkgroup_data {
    jsonFile=$1
    url="/bulkgroups"
    body="$(cat data/${jsonFile}.json)"

    echo -e "\nBulk creating groups from $jsonFile.json...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'POST' "$url" "$body" "$function_name" )

    echo "POST $url : $response" >&2
}

function create_or_update_bulkgroup_data {
    group=$1
    jsonFile=$2

    exists="$(check_group_exists ${group})"
    if [[ "$exists" == 'false' ]]; then
        create_bulkgroup_data ${jsonFile}
    fi
}

function check_group_exists {
    group=$1
    url="/groups/$group"
    body='{}'

    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'GET' "$url" "$body" "$function_name" )
    status_code=$(echo "$response" | jq -r '.statusCode')

    echo "GET $url : $status_code" >&2

    if [[ "$status_code" -eq 404 ]] ; then
        echo 'false'
    else
        echo 'true'
    fi
}

function create_bulkdevice_data {
    jsonFile=$1
    url="/bulkdevices"
    body="$(cat data/${jsonFile}.json)"

    echo -e "\nBulk creating device from $jsonFile.json...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'POST' "$url" "$body" "$function_name" )

    echo "POST $url : $response" >&2
}

function create_or_update_bulkdevice_data {
    device=$1
    jsonFile=$2

    exists="$(check_device_exists ${device})"
    if [[ "$exists" == 'false' ]]; then
        create_bulkdevice_data ${jsonFile}
    fi
}

function check_device_exists {
    device=$1
    url="/devices/$device"
    body='{}'

    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'GET' "$url" "$body" "$function_name" )
    status_code=$(echo "$response" | jq -r '.statusCode')

    echo "GET $url : $status_code" >&2

    if [[ "$status_code" -eq 404 ]] ; then
        echo 'false'
    else
        echo 'true'
    fi
}

function create_provisioning_template {
    template=$1
    url="/policies"
    body="$(cat data/${template}.json)"

    echo -e "\nCreating $template provisioning policy...\n"
    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'POST' "$url" "$body" "$function_name" )

    echo "POST $url : $response" >&2
}

function create_or_update_provisioning_template {
    template=$1

    exists="$(check_provisioning_template_exists ${group})"
    if [[ "$exists" == 'false' ]]; then
        create_provisioning_template ${template}
    fi
}

function check_provisioning_template_exists {
    template=$1
    url="/policies/$template"
    body='{}'

    response=$( lambaInvokeRestApi "$assetlibrary_stack_name" 'GET' "$url" "$body" "$function_name" )
    status_code=$(echo "$response" | jq -r '.statusCode')

    echo "GET $url : $status_code" >&2

    if [[ "$status_code" -eq 204 ]] ; then
        echo 'false'
    else
        echo 'true'
    fi
}
