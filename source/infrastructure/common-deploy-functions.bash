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

function verifyMandatoryFile {
    file_location=$1
    service_name=$2

    if [[ ! -f ${file_location} ]]; then
        echo "$service_name config ($file_location) must exist" >&2
        exit 1
    fi
}

function verifyMandatoryDirectory {
    dir=$1

    if [[ ! -d ${dir} ]]; then
        echo "$dir must exist" >&2
        exit 1
    fi
}

function verifyMandatoryArgument {
    arg_name=$1
    arg_character=$2
    arg_value=$3

#    echo "verifyMandatoryArgument:" >&2
#    echo "    arg_name: $arg_name" >&2
#    echo "    arg_character: $arg_character" >&2
#    echo "    arg_value: $arg_value" >&2

    if [[ -z "$arg_value" ]]; then
        echo "(-$arg_character) $arg_name is required" >&2
        echo 1
    else
        echo 0
    fi
}

function defaultIfNotSet {
    arg_name=$1
    arg_character=$2
    arg_value=$3
    default_value=$4

#    echo "defaultIfNotSet:" >&2
#    echo "    arg_name: $arg_name" >&2
#    echo "    arg_character: $arg_character" >&2
#    echo "    arg_value: $arg_value" >&2
#    echo "    default_value: $default_value" >&2

    if [[ -z "$arg_value" ]]; then
        echo "(-$arg_character) $arg_name not provided, therefore set to $default_value" >&2
        echo $default_value
    else
        echo $arg_value
    fi
}

function verifyListContainsArgument {
    arg_name=$1
    shift
    arg_character=$1
    shift
    arg_value=$1
    shift
    allowed_values=("$@")

#    echo "verifyListContainsArgument:" >&2
#    echo "    arg_name: $arg_name" >&2
#    echo "    arg_character: $arg_character" >&2
#    echo "    arg_value: $arg_value" >&2
#    echo "    allowed_values: $allowed_values" >&2

    match=0
    for value in "${allowed_values[@]}"; do
        if [[ ${value} = "$arg_value" ]]; then
            match=1
            break
        fi
    done
    if [[ $match = 0 ]]; then
        echo "(-$arg_character) $arg_name is invalid" >&2
        echo 1
    else
        echo 0
    fi
}

function verifyApiGatewayAuthType {
    auth=$1

#    echo "verifyApiGatewayAuthType:" >&2
#    echo "    auth: $auth" >&2

    valid_auth_types=(
      None
      Private
      Cognito
      LambdaRequest
      LambdaToken
      ApiKey
      IAM
    )

    invalid=$( verifyListContainsArgument API_GATEWAY_AUTH a "$auth" "${valid_auth_types[@]}" )
    if [[ ${invalid} = 1 ]]; then
        echo '(-a) API_GATEWAY_AUTH is invalid' >&2
        echo 1
    else
        echo 0
    fi
}

function buildAwsArgs {
    region=$1
    profile=$2

#    echo "buildAwsArgs:" >&2
#    echo "    region: $region" >&2
#    echo "    profile: $profile" >&2

    args=
    if [[ -n "$region" ]]; then
        args="--region $region "
    fi
    if [[ -n "$profile" ]]; then
        args="$args--profile $profile"
    fi
    echo $args
}

function buildAwsScriptArgs {
    region=$1
    profile=$2

#    echo "buildAwsScriptArgs:" >&2
#    echo "    region: $region" >&2
#    echo "    profile: $profile" >&2

    args=
    if [[ -n "$region" ]]; then
        args="-R $region "
    fi
    if [[ -n "$profile" ]]; then
        args="$args-P $profile"
    fi
    echo $args
}

function logTitle {
    text=$1
    echo "
>>>>>>>>  $text  <<<<<<<<
"
}


function lambaInvokeRestApi {
    stack_name=$1
    method=$2
    path=$3
    body=$4             # optional
    function_name=$5    # optional

    if [[ -z "$body" ]]; then
        body='{}'
    fi

    if [[ -z "$function_name" ]]; then
        stack_exports=$(aws cloudformation list-exports $AWS_ARGS)
        function_name_export="$stack_name-restApiFunctionName"
        function_name=$(echo ${stack_exports} \
          | jq -r --arg function_name_export "$function_name_export" \
          '.Exports[] | select(.Name==$function_name_export) | .Value')
    fi

    response_file=lambda_response.json

    event_payload='
    {
        "resource": "/{proxy+}",
        "path": "'"$path"'",
        "httpMethod": "'"$method"'",
        "headers": {
            "accept": "application/vnd.aws-cdf-v1.0+json",
            "content-type": "application/vnd.aws-cdf-v1.0+json"
        },
        "body": '"$( echo $body | jq '@json')"'
    }'

    aws lambda invoke --function-name ${function_name} --payload "$event_payload" --cli-binary-format raw-in-base64-out \
        --log-type None $AWS_ARGS ${response_file} >&2

    if [[ -f "$response_file" ]]; then
        response=$(cat "$response_file")
        rm -f "$response_file"
    fi
    echo ${response}
}

function getAwsAccountId {
    aws_args=$1
    echo $(aws sts get-caller-identity --output text --query 'Account' $AWS_ARGS)
}

function getAwsRegion  {
    aws_args=$1
    echo $(aws configure get region $AWS_ARGS)
}

function asksure {
    config_message=$1
    bypass_prompt=$2

    echo -n "$config_message"

    if [ -z "$bypass_prompt" ]; then
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
        if [[ "$retval" -eq 0 ]]; then
            echo "Okay, will continue....
            "
        else
            echo "Aborted"
            exit 1
        fi
    else
        echo -n "$config_message"
    fi
}
