#!/bin/
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

# Create event source and events
function create_eventsource_events {
    eventSourceFile=$1
    eventFile=$2
    url="/eventsources"

    body="$(cat data/${eventSourceFile}.json)"
    echo "body : "$body

    echo -e "\n Creating Event Sources - $eventSourceFile.json ...\n"
    response=$( lambaInvokeRestApi "$eventsProcessor_stack_name" 'POST' "$url" "$body" "$function_name" )
    echo "POST $url : $response"

    eventsource_location=$( echo $response | jq -r '.headers.location' )
    echo "EventSource Location : " $eventsource_location
    eventSourceId=${eventsource_location##*/}
    echo "EventSourceId : " $eventSourceId

    create_events $eventFile $eventSourceId
}

# Create new events
function create_events {
    eventFile=$1
    eventSourceId=$2
    url="/eventsources/$eventSourceId/events"
    body="$(cat data/${eventFile}.json)"

    echo -e "\n Creating Events - $eventFile.json ...\n"
    echo $body | jq -rc '.[]' | while IFS='' read event;do
      response=$( lambaInvokeRestApi "$eventsProcessor_stack_name" 'POST' "$url" "$event" "$function_name" )
      echo "POST $url : $response" >&2
    done
}

# Delete the existing event source
function delete_existing_event_source {
  url="/eventsources"
  body='{}'

  response=$( lambaInvokeRestApi "$eventsProcessor_stack_name" 'GET' "$url" "$body" "$function_name" )
  responseBody=$(echo "$response" | jq -r '.body')
  echo $responseBody | jq -rc '.results[]' |  while IFS='' read es;do
    selectedId=$(echo $es | jq -r '.id')
    urlWithId=$url"/"$selectedId

    response=$( lambaInvokeRestApi "$eventsProcessor_stack_name" 'DELETE' "$urlWithId" "$body" "$function_name" )
    status_code=$(echo "$response" | jq -r '.statusCode')
    echo "DELETE $urlWithId : $status_code" >&2
  done
}
