---
title: "Connected Device Framework: Asset Library History v1.0.0"
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

<h1 id="connected-device-framework-asset-library-history">Connected Device Framework: Asset Library History v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

The Asset Library History service tracks changes to all devices, groups, policies, and templates within the Asset Library.

<h1 id="connected-device-framework-asset-library-history-default">Default</h1>

## List all events of a given category

<a id="opIdlistCategoryEvents"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /{category} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/{category}', headers = headers)

print(r.json())

```

`GET /{category}`

List all events of a given category

<h3 id="list-all-events-of-a-given-category-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|timeFrom|query|string(date-time)|false|Only display category events since this time|
|timeTo|query|string(date-time)|false|Only display category events prior to this time|
|user|query|string|false|Only display category events authored by this user|
|event|query|string|false|Only display category events of this type|
|sort|query|string|false|Sort order|
|token|query|string(binary)|false|Pagination token|
|limit|query|number(int32)|false|Maximum no. events to return|
|category|path|string|true|Asset Library category|

#### Enumerated Values

|Parameter|Value|
|---|---|
|event|create|
|event|modify|
|event|delete|
|sort|asc|
|sort|desc|
|category|device|
|category|group|
|category|policy|
|category|groupTemplate|
|category|deviceTemplate|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "objectId": "string",
      "type": "devices",
      "time": "2020-06-12T19:03:11Z",
      "event": "create",
      "user": "string",
      "state": {}
    }
  ],
  "pagination": {
    "token": "string",
    "limit": 0
  }
}
```

<h3 id="list-all-events-of-a-given-category-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Events](#schemaevents)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List all events of a specific Asset Library object

<a id="opIdlistObjectEvents"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /{category}/{objectId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/{category}/{objectId}', headers = headers)

print(r.json())

```

`GET /{category}/{objectId}`

List all events of a specific Asset Library object

<h3 id="list-all-events-of-a-specific-asset-library-object-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|timeAt|query|string(date-time)|false|Return the known state of a specific object at this time|
|timeFrom|query|string(date-time)|false|Only display category events since this time|
|timeTo|query|string(date-time)|false|Only display category events prior to this time|
|user|query|string|false|Only display category events authored by this user|
|event|query|string|false|Only display category events of this type|
|sort|query|string|false|Sort order|
|token|query|string(binary)|false|Pagination token|
|limit|query|number(int32)|false|Maximum no. events to return|
|category|path|string|true|Asset Library category|
|objectId|path|string|true|Asset Library object id (deviceId, groupPath, policyId, or templateId)|

#### Enumerated Values

|Parameter|Value|
|---|---|
|event|create|
|event|modify|
|event|delete|
|sort|asc|
|sort|desc|
|category|device|
|category|group|
|category|policy|
|category|groupTemplate|
|category|deviceTemplate|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "objectId": "string",
      "type": "devices",
      "time": "2020-06-12T19:03:11Z",
      "event": "create",
      "user": "string",
      "state": {}
    }
  ],
  "pagination": {
    "token": "string",
    "limit": 0
  }
}
```

<h3 id="list-all-events-of-a-specific-asset-library-object-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Events](#schemaevents)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_Event">Event</h2>
<!-- backwards compatibility -->
<a id="schemaevent"></a>
<a id="schema_Event"></a>
<a id="tocSevent"></a>
<a id="tocsevent"></a>

```json
{
  "objectId": "string",
  "type": "devices",
  "time": "2020-06-12T19:03:11Z",
  "event": "create",
  "user": "string",
  "state": {}
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|objectId|string|false|none|DeviceId, groupPath, policyId or templateId of the object.|
|type|string|false|none|category of object.|
|time|string(date-time)|false|none|Date/time of event.|
|event|string|false|none|Event type.|
|user|string|false|none|User who authored the change.|
|state|object|false|none|Full json representation of the object (e.g. a Device) at the time the change was made.|

#### Enumerated Values

|Property|Value|
|---|---|
|type|devices|
|type|groups|
|type|deviceTemplates|
|type|groupTemplates|
|type|policies|
|event|create|
|event|modify|
|event|delete|

<h2 id="tocS_Events">Events</h2>
<!-- backwards compatibility -->
<a id="schemaevents"></a>
<a id="schema_Events"></a>
<a id="tocSevents"></a>
<a id="tocsevents"></a>

```json
{
  "results": [
    {
      "objectId": "string",
      "type": "devices",
      "time": "2020-06-12T19:03:11Z",
      "event": "create",
      "user": "string",
      "state": {}
    }
  ],
  "pagination": {
    "token": "string",
    "limit": 0
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[[Event](#schemaevent)]|false|none|none|
|pagination|object|false|none|none|
|» token|string(binary)|false|none|none|
|» limit|integer|false|none|none|

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
|message|string|false|none|none|

