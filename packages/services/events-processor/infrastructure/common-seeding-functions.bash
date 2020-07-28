#!/bin/bash

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