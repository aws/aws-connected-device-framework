---
title: "Connected Device Framework: Notifications v1.0.0"
language_tabs:
  - shell: Shell
  - node: Node
  - python: Python
language_clients:
  - shell: curl
  - node: request
  - python: python3
toc_footers: []
includes: []
search: true
highlight_theme: darkula
headingLevel: 2

---

<!-- Generator: Widdershins v4.0.1 -->

<h1 id="connected-device-framework-notifications">Connected Device Framework: Notifications v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

The CDF Notifications umbrella of services receives input from a number of different sources (e.g. IoT Core, DynamoDB Streams, API Gateway), and filters based on a subscriber's notification settings.  Any filtered messages are then sent on to a number of pre-configured targets (e.g. AppSync, SNS, or republished to IoT Core).

The CDF Notifications is comprised of 2 micro-services:  the CDF Events Processor, and the CDF Notification Dispatcher.  

<h1 id="connected-device-framework-notifications-eventsources">EventSources</h1>

An `EventSource` must be congifured per source of events to allow the event processor to consume events.  The following types of event sources are supported:
- DynamoDB
- IoT Core

All incoming events must contain an `id` that can be used to match against a configured `EventSource` `eventSourceId`.  If a matching `EventSource` configuration cannot be found, the event is dropped.

Events that are sourced via API Gateway or IoT Core are to be provided in the common message format, whereas events sourced from DynamoDB are converted to the common message format by the Event Processor.

## Creates a new EventSource

<a id="opIdcreateEventSource"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /eventsources \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/eventsources', headers = headers)

print(r.json())

```

`POST /eventsources`

> Body parameter

```json
{
  "id": "arn:aws:dynamodb:us-west-2:123456789012:table/myTable\"",
  "name": "Processed Events",
  "sourceType": "DynamoDB",
  "principal": "thingName",
  "dynamoDb": {
    "tableName": "myTable"
  }
}
```

<h3 id="creates-a-new-eventsource-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[EventSourceDetail](#schemaeventsourcedetail)|true|none|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="creates-a-new-eventsource-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||URI of the created resource|

<aside class="success">
This operation does not require authentication
</aside>

## Returns all configured event sources

<a id="opIdlistEventSources"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /eventsources \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/eventsources', headers = headers)

print(r.json())

```

`GET /eventsources`

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="returns-all-configured-event-sources-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a single event source

<a id="opIdgetEventSource"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /eventsources/{eventSourceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/eventsources/{eventSourceId}', headers = headers)

print(r.json())

```

`GET /eventsources/{eventSourceId}`

<h3 id="returns-a-single-event-source-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|eventSourceId|path|string|true|Event source ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="returns-a-single-event-source-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes an event source

<a id="opIddeleteEventSource"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /eventsources/{eventSourceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/eventsources/{eventSourceId}', headers = headers)

print(r.json())

```

`DELETE /eventsources/{eventSourceId}`

<h3 id="deletes-an-event-source-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|eventSourceId|path|string|true|Event source ID|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-an-event-source-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|Deleted successfully|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-notifications-events">Events</h1>

An `Event` represents a message consumed from an event source that has had a rule evaluated against it (its `conditions`). Each event also specifies the available subscription targets (its `supportedTargets`) such as email and/or sms, as well as custom message `templates` to notify of the alert.

## Creates a new Event

<a id="opIdcreateEvent"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /eventsources/{eventSourceId}/events \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/eventsources/{eventSourceId}/events', headers = headers)

print(r.json())

```

`POST /eventsources/{eventSourceId}/events`

> Body parameter

```json
{
  "name": "Low Battery Alert",
  "conditions": {
    "all": [
      {
        "fact": "batteryLevel",
        "operator": "lessThanInclusive",
        "value": 20
      }
    ]
  },
  "supportedTargets": {
    "email": "default",
    "sms": "small"
  },
  "templates": {
    "default": "The battery for bowl {{=it.principalValue}} is low.",
    "small": "{{=it.principalValue}} battery low"
  }
}
```

<h3 id="creates-a-new-event-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Event](#schemaevent)|true|none|
|eventSourceId|path|string|true|Event source ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="creates-a-new-event-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||URI of the created resource|

<aside class="success">
This operation does not require authentication
</aside>

## Lists all events for a specific event source

<a id="opIdlistEventsForEventSource"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /eventsources/{eventSourceId}/events \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/eventsources/{eventSourceId}/events', headers = headers)

print(r.json())

```

`GET /eventsources/{eventSourceId}/events`

<h3 id="lists-all-events-for-a-specific-event-source-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|eventSourceId|path|string|true|Event source ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="lists-all-events-for-a-specific-event-source-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a single event

<a id="opIdgetEvent"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /events/{eventId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/events/{eventId}', headers = headers)

print(r.json())

```

`GET /events/{eventId}`

<h3 id="returns-a-single-event-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|eventId|path|string|true|Event ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="returns-a-single-event-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes an event

<a id="opIddeleteEvent"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /events/{eventId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/events/{eventId}', headers = headers)

print(r.json())

```

`DELETE /events/{eventId}`

<h3 id="deletes-an-event-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|eventId|path|string|true|Event ID|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-an-event-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|Deleted successfully|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-notifications-subscriptions">Subscriptions</h1>

A 'Subscription' allows a user to subscribe to an event, optionally configuring which supported targets to retrieve the alert by.

## Creates a new subscription of an event

<a id="opIdcreateSubscription"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /events/{eventId}/subscriptions \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/events/{eventId}/subscriptions', headers = headers)

print(r.json())

```

`POST /events/{eventId}/subscriptions`

> Body parameter

```json
{
  "user": {
    "id": "user123"
  },
  "principalValue": "device001",
  "targets": {
    "email": {
      "address": "someone@somewhere.com"
    },
    "sms": {
      "phoneNumber": 15551231234
    }
  }
}
```

<h3 id="creates-a-new-subscription-of-an-event-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Subscription](#schemasubscription)|true|none|
|eventId|path|string|true|Event ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="creates-a-new-subscription-of-an-event-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||URI of the created resource|

<aside class="success">
This operation does not require authentication
</aside>

## Lists all subscriptions for the provided event

<a id="opIdlistSubscriptionsForEvent"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /events/{eventId}/subscriptions \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/events/{eventId}/subscriptions', headers = headers)

print(r.json())

```

`GET /events/{eventId}/subscriptions`

<h3 id="lists-all-subscriptions-for-the-provided-event-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|fromSubscriptionId|query|string|false|Subscription ID to use as the start of paginated results|
|eventId|path|string|true|Event ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="lists-all-subscriptions-for-the-provided-event-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a single subscription

<a id="opIdgetSubscription"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /subscriptions/{subscriptionId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/subscriptions/{subscriptionId}', headers = headers)

print(r.json())

```

`GET /subscriptions/{subscriptionId}`

<h3 id="returns-a-single-subscription-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|subscriptionId|path|string|true|Subscription ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="returns-a-single-subscription-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes a subscription

<a id="opIddeleteSubscription"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /subscriptions/{subscriptionId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/subscriptions/{subscriptionId}', headers = headers)

print(r.json())

```

`DELETE /subscriptions/{subscriptionId}`

<h3 id="deletes-a-subscription-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|subscriptionId|path|string|true|Subscription ID|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-a-subscription-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|Deleted successfully|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Lists all subscriptions for the provided user

<a id="opIdlistSubscriptionsForUser"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /user/{userId}/subscriptions \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/user/{userId}/subscriptions', headers = headers)

print(r.json())

```

`GET /user/{userId}/subscriptions`

<h3 id="lists-all-subscriptions-for-the-provided-user-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|userId|path|string|true|User ID|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="lists-all-subscriptions-for-the-provided-user-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|none|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_EventSourceSummary">EventSourceSummary</h2>
<!-- backwards compatibility -->
<a id="schemaeventsourcesummary"></a>
<a id="schema_EventSourceSummary"></a>
<a id="tocSeventsourcesummary"></a>
<a id="tocseventsourcesummary"></a>

```json
{
  "id": "string",
  "name": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|none|For DynamoDB event sources, this must be provided and represents the DynamoDB table Arn.<br><br>For IoTCore event sources, this is a automatically generated unique id, and will be added to all messages originating from this event source.|
|name|string|true|none|Name of the event source.|

<h2 id="tocS_EventSourceDetail">EventSourceDetail</h2>
<!-- backwards compatibility -->
<a id="schemaeventsourcedetail"></a>
<a id="schema_EventSourceDetail"></a>
<a id="tocSeventsourcedetail"></a>
<a id="tocseventsourcedetail"></a>

```json
{
  "id": "string",
  "name": "string",
  "sourceType": "DynamoDB",
  "principal": "string",
  "dynamoDb": {
    "tableName": "string"
  },
  "iotCore": {
    "mqttTopic": "string",
    "attributes": {
      "property1": "string",
      "property2": "string"
    }
  }
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[EventSourceSummary](#schemaeventsourcesummary)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» sourceType|string|true|none|Event source type|
|» principal|string|true|none|The attribute within the event message that represents the principal (e.g. deviceId, thingName, or username).|
|» dynamoDb|object|false|none|DynamoDB event source specific configuration.|
|»» tableName|string|true|none|Name of the DynamoDB table|
|» iotCore|object|false|none|IoTCore event source configuration.|
|»» mqttTopic|string|true|none|The MQTT topic that this event source subscribes to.  Supports wildcards.|
|»» attributes|object|true|none|A map of source message attributes that will be transferred to the common message format for processing,|
|»»» **additionalProperties**|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|sourceType|DynamoDB|
|sourceType|IoTCore|

<h2 id="tocS_EventSourceList">EventSourceList</h2>
<!-- backwards compatibility -->
<a id="schemaeventsourcelist"></a>
<a id="schema_EventSourceList"></a>
<a id="tocSeventsourcelist"></a>
<a id="tocseventsourcelist"></a>

```json
{
  "results": [
    {
      "id": "string",
      "name": "string"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[[EventSourceSummary](#schemaeventsourcesummary)]|false|none|A list of event sources.|

<h2 id="tocS_Event">Event</h2>
<!-- backwards compatibility -->
<a id="schemaevent"></a>
<a id="schema_Event"></a>
<a id="tocSevent"></a>
<a id="tocsevent"></a>

```json
{
  "name": "string",
  "conditions": {
    "all": null,
    "any": null
  },
  "ruleParameters": [
    "string"
  ],
  "enabled": true,
  "templates": {
    "property1": "string",
    "property2": "string"
  },
  "supportedTargets": {
    "email": "string",
    "sms": "string"
  },
  "eventId": "string",
  "eventSourceId": "string",
  "principal": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|name|string|true|none|Name of event|
|conditions|[EventConditions](#schemaeventconditions)|true|none|none|
|ruleParameters|[oneOf]|false|none|List of parameters that require values providing along with a subscription in order to evaluate the event conditions|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|string|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|number|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|boolean|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|enabled|boolean|false|none|Enabled state of the event|
|templates|object|true|none|A map of message templates (in VTL format) to be compiled for the different supported targets|
|» **additionalProperties**|string|false|none|none|
|supportedTargets|object|false|none|A map of supported targets, along with the messaging template to use|
|» email|string|false|none|none|
|» sms|string|false|none|none|
|eventId|string|false|read-only|Event ID|
|eventSourceId|string|false|read-only|Event source ID|
|principal|string|false|read-only|The name of the attribute that represents the principal in incoming messages from the event source|

<h2 id="tocS_EventConditions">EventConditions</h2>
<!-- backwards compatibility -->
<a id="schemaeventconditions"></a>
<a id="schema_EventConditions"></a>
<a id="tocSeventconditions"></a>
<a id="tocseventconditions"></a>

```json
{
  "all": null,
  "any": null
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|all|any|false|none|All of these conditions must evalute to true for the alert to be triggered|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[EventConditions](#schemaeventconditions)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[[EventCondition](#schemaeventcondition)]|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|any|any|false|none|Any of these conditions must evalute to true for the alert to be triggered|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[EventConditions](#schemaeventconditions)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[[EventCondition](#schemaeventcondition)]|false|none|none|

<h2 id="tocS_EventCondition">EventCondition</h2>
<!-- backwards compatibility -->
<a id="schemaeventcondition"></a>
<a id="schema_EventCondition"></a>
<a id="tocSeventcondition"></a>
<a id="tocseventcondition"></a>

```json
{
  "fact": "string",
  "operator": "equal",
  "value": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|fact|string|false|none|The name of the attribute (in the common message format) to be evaluated|
|operator|string|false|none|The type of operator to evaluate the fact with|
|value|any|false|none|The value of the fact to evaluate|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|string|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|number|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|boolean|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|operator|equal|
|operator|notEqual|
|operator|lessThan|
|operator|lessThanExclusive|
|operator|greaterThan|
|operator|greaterThanExclusive|
|operator|in|
|operator|notIn|
|operator|contains|
|operator|doesNotContain|

<h2 id="tocS_EventList">EventList</h2>
<!-- backwards compatibility -->
<a id="schemaeventlist"></a>
<a id="schema_EventList"></a>
<a id="tocSeventlist"></a>
<a id="tocseventlist"></a>

```json
{
  "results": [
    {
      "name": "string",
      "conditions": {
        "all": null,
        "any": null
      },
      "ruleParameters": [
        "string"
      ],
      "enabled": true,
      "templates": {
        "property1": "string",
        "property2": "string"
      },
      "supportedTargets": {
        "email": "string",
        "sms": "string"
      },
      "eventId": "string",
      "eventSourceId": "string",
      "principal": "string"
    }
  ],
  "pagination": {
    "offset": {
      "eventSourceId": "string",
      "eventId": "string"
    },
    "count": 0
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[[Event](#schemaevent)]|false|none|A list of events.|
|pagination|object|false|none|Pagination details|
|» offset|object|false|none|none|
|»» eventSourceId|string|false|none|The event source ID to paginate from|
|»» eventId|string|false|none|The event ID to paginate from|
|» count|number|false|none|none|

<h2 id="tocS_Subscription">Subscription</h2>
<!-- backwards compatibility -->
<a id="schemasubscription"></a>
<a id="schema_Subscription"></a>
<a id="tocSsubscription"></a>
<a id="tocssubscription"></a>

```json
{
  "id": "string",
  "user": {
    "id": "string"
  },
  "principalValue": "string",
  "targets": {
    "email": {
      "address": {}
    },
    "sms": {
      "phoneNumber": {}
    }
  },
  "ruleParameterValues": {
    "property1": "string",
    "property2": "string"
  },
  "event": {
    "id": "string",
    "name": "string",
    "conditions": {
      "all": null,
      "any": null
    }
  },
  "enabled": true,
  "alerted": true
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|read-only|Subscription ID|
|user|object|true|none|none|
|» id|string|true|none|User ID|
|principalValue|string|true|none|Value of the principal attribute of the event to susbcribe to|
|targets|object|false|none|none|
|» email|object|false|none|none|
|»» address|object|true|none|Email address|
|» sms|object|false|none|none|
|»» phoneNumber|object|true|none|SMS phone number|
|ruleParameterValues|object|false|none|The values of any required rule parameters of the event|
|» **additionalProperties**|any|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|string|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|number|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|boolean|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|event|object|false|read-only|none|
|» id|string|false|none|Event ID|
|» name|string|false|none|Event name|
|» conditions|[EventConditions](#schemaeventconditions)|false|none|none|
|enabled|boolean|false|none|Enabled status|
|alerted|boolean|false|read-only|Alerted status|

<h2 id="tocS_SubscriptionList">SubscriptionList</h2>
<!-- backwards compatibility -->
<a id="schemasubscriptionlist"></a>
<a id="schema_SubscriptionList"></a>
<a id="tocSsubscriptionlist"></a>
<a id="tocssubscriptionlist"></a>

```json
{
  "results": [
    {
      "id": "string",
      "user": {
        "id": "string"
      },
      "principalValue": "string",
      "targets": {
        "email": {
          "address": {}
        },
        "sms": {
          "phoneNumber": {}
        }
      },
      "ruleParameterValues": {
        "property1": "string",
        "property2": "string"
      },
      "event": {
        "id": "string",
        "name": "string",
        "conditions": {
          "all": null,
          "any": null
        }
      },
      "enabled": true,
      "alerted": true
    }
  ],
  "pagination": {
    "offset": {
      "eventId": "string",
      "subscriptionId": "string"
    },
    "count": 0
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[[Subscription](#schemasubscription)]|false|none|A list of subscriptions.|
|pagination|object|false|none|none|
|» offset|object|false|none|none|
|»» eventId|string|false|none|The event ID to paginate from|
|»» subscriptionId|string|false|none|The subscription ID to paginate from|
|» count|number|false|none|none|

<h2 id="tocS_Error">Error</h2>
<!-- backwards compatibility -->
<a id="schemaerror"></a>
<a id="schema_Error"></a>
<a id="tocSerror"></a>
<a id="tocserror"></a>

```json
{
  "message": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|message|string|false|none|Error message|

