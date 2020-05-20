#!/bin/bash

set -e

function verifyMandatoryFile {
    file_location=$1
    service_name=$2

    if [ ! -f $file_location ]; then
        echo "$service_name config ($file_location) must exist" > /dev/tty
        exit 1
    fi
}

function verifyMandatoryDirectory {
    dir=$1

    if [ ! -d $dir ]; then
        echo "$dir must exist" > /dev/tty
        exit 1
    fi
}

function verifyMandatoryArgument {
    arg_name=$1
    arg_character=$2
    arg_value=$3

#    echo "verifyMandatoryArgument:" > /dev/tty
#    echo "    arg_name: $arg_name" > /dev/tty
#    echo "    arg_character: $arg_character" > /dev/tty
#    echo "    arg_value: $arg_value" > /dev/tty

    if [ -z "$arg_value" ]; then
        echo "(-$arg_character) $arg_name is required" > /dev/tty
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

#    echo "defaultIfNotSet:" > /dev/tty
#    echo "    arg_name: $arg_name" > /dev/tty
#    echo "    arg_character: $arg_character" > /dev/tty
#    echo "    arg_value: $arg_value" > /dev/tty
#    echo "    default_value: $default_value" > /dev/tty

    if [ -z "$arg_value" ]; then
        echo "(-$arg_character) $arg_name not provided, therefore set to $default_value" > /dev/tty
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

#    echo "verifyListContainsArgument:" > /dev/tty
#    echo "    arg_name: $arg_name" > /dev/tty
#    echo "    arg_character: $arg_character" > /dev/tty
#    echo "    arg_value: $arg_value" > /dev/tty
#    echo "    allowed_values: $allowed_values" > /dev/tty

    match=0
    for value in "${allowed_values[@]}"; do
        if [[ $value = "$arg_value" ]]; then
            match=1
            break
        fi
    done
    if [[ $match = 0 ]]; then
        echo "(-$arg_character) $arg_name is invalid" > /dev/tty
        echo 1
    else
        echo 0
    fi
}

function verifyApiGatewayAuthType {
    auth=$1

#    echo "verifyApiGatewayAuthType:" > /dev/tty
#    echo "    auth: $auth" > /dev/tty

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
    if [[ $invalid = 1 ]]; then
        echo '(-a) API_GATEWAY_AUTH is invalid' > /dev/tty
        echo 1
    else
        echo 0
    fi
}

function buildAwsArgs {
    region=$1
    profile=$2

#    echo "buildAwsArgs:" > /dev/tty
#    echo "    region: $region" > /dev/tty
#    echo "    profile: $profile" > /dev/tty

    args=
    if [ -n "$region" ]; then
        args="--region $region "
    fi
    if [ -n "$profile" ]; then
        args="$args--profile $profile"
    fi
    echo $args
}

function buildAwsScriptArgs {
    region=$1
    profile=$2

#    echo "buildAwsScriptArgs:" > /dev/tty
#    echo "    region: $region" > /dev/tty
#    echo "    profile: $profile" > /dev/tty

    args=
    if [ -n "$region" ]; then
        args="-R $region "
    fi
    if [ -n "$profile" ]; then
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