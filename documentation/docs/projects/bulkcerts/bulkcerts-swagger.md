---
title: "Connected Device Framework: Bulk Certs v1.0.0"
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

<h1 id="connected-device-framework-bulk-certs">Connected Device Framework: Bulk Certs v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

REST API for bulk creating certificates.

<h1 id="connected-device-framework-bulk-certs-bulk-certificate-creation">Bulk Certificate Creation</h1>

Allows for the asynchronous creation of certifcates in bulk.  The `bulkcertificatestask` endpoints allow for the management of the asynchronous task itself, whereas the `bulk certificates` endpoints allow for the retrieval of the outcome of the task.

Optionally, the certificates may be registered with AWS IoT.  This allows for scenarios such as JITP (just-in-time provisioning).

## Creates a batch of certificates.

<a id="opIdcreateCertificates"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /certificates \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/certificates', headers = headers)

print(r.json())

```

`POST /certificates`

> Body parameter

```json
{
  "quantity": 0,
  "register": true
}
```

<h3 id="creates-a-batch-of-certificates.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[BulkCertificatesTaskRequest](#schemabulkcertificatestaskrequest)|true|none|

> Example responses

> 202 Response

```json
{
  "quantity": 0,
  "register": true,
  "taskId": "string",
  "status": "in_progress"
}
```

<h3 id="creates-a-batch-of-certificates.
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|202|[Accepted](https://tools.ietf.org/html/rfc7231#section-6.3.3)|Created successfully|[BulkCertificatesTaskResponse](#schemabulkcertificatestaskresponse)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|202|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve a batch of pre-generated certificates (the outcome of a batch certificate creation task)

<a id="opIdgetBulkCertificates"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /certificates/{taskId} \
  -H 'Accept: application/zip'

```

```python
import requests
headers = {
  'Accept': 'application/zip'
}

r = requests.get('/certificates/{taskId}', headers = headers)

print(r.json())

```

`GET /certificates/{taskId}`

<h3 id="retrieve-a-batch-of-pre-generated-certificates-(the-outcome-of-a-batch-certificate-creation-task)-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|taskId|path|string|true|Id of the bulk certificate creation task|

> Example responses

> 200 Response

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="retrieve-a-batch-of-pre-generated-certificates-(the-outcome-of-a-batch-certificate-creation-task)-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Zipfile of certificates|string|
|303|[See Other](https://tools.ietf.org/html/rfc7231#section-6.4.4)|If certificate creation is still inprogress, a redirect to the certificate task status|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|303|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve status of a bulk certificates task

<a id="opIdgetBulkCertificatesTaskStauts"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /certificates/{taskId}/task \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/certificates/{taskId}/task', headers = headers)

print(r.json())

```

`GET /certificates/{taskId}/task`

<h3 id="retrieve-status-of-a-bulk-certificates-task-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|taskId|path|string|true|Id of the bulk certificate creation task|

> Example responses

> 200 Response

```json
{
  "taskId": "string",
  "status": "pending",
  "batchDate": 0,
  "chunksPending": 0,
  "chunksTotal": 0
}
```

<h3 id="retrieve-status-of-a-bulk-certificates-task-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Pending|[BulkCertificatesTaskStatusResponse](#schemabulkcertificatestaskstatusresponse)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-bulk-certs-bulk-certificate-creation-for-specific-supplier">Bulk Certificate Creation for Specific Supplier</h1>

## Creates a batch of certificates for a supplier, using a supplier's specific CA.

<a id="opIdsupplierCreateCertificates"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /supplier/{supplierId}/certificates \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/supplier/{supplierId}/certificates', headers = headers)

print(r.json())

```

`POST /supplier/{supplierId}/certificates`

> Body parameter

```json
{
  "quantity": 0,
  "register": true
}
```

<h3 id="creates-a-batch-of-certificates-for-a-supplier,-using-a-supplier's-specific-ca.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[BulkCertificatesTaskRequest](#schemabulkcertificatestaskrequest)|true|none|
|supplierId|path|string|true|Id supplier for which to create certificates|

> Example responses

> 202 Response

```json
{
  "quantity": 0,
  "register": true,
  "taskId": "string",
  "status": "in_progress"
}
```

<h3 id="creates-a-batch-of-certificates-for-a-supplier,-using-a-supplier's-specific-ca.
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|202|[Accepted](https://tools.ietf.org/html/rfc7231#section-6.3.3)|Created successfully|[BulkCertificatesTaskResponse](#schemabulkcertificatestaskresponse)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|202|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_BulkCertificatesTaskRequest">BulkCertificatesTaskRequest</h2>
<!-- backwards compatibility -->
<a id="schemabulkcertificatestaskrequest"></a>
<a id="schema_BulkCertificatesTaskRequest"></a>
<a id="tocSbulkcertificatestaskrequest"></a>
<a id="tocsbulkcertificatestaskrequest"></a>

```json
{
  "quantity": 0,
  "register": true
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|quantity|number|false|none|none|
|register|boolean|false|none|none|

<h2 id="tocS_BulkCertificatesTaskResponse">BulkCertificatesTaskResponse</h2>
<!-- backwards compatibility -->
<a id="schemabulkcertificatestaskresponse"></a>
<a id="schema_BulkCertificatesTaskResponse"></a>
<a id="tocSbulkcertificatestaskresponse"></a>
<a id="tocsbulkcertificatestaskresponse"></a>

```json
{
  "quantity": 0,
  "register": true,
  "taskId": "string",
  "status": "in_progress"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[BulkCertificatesTaskRequest](#schemabulkcertificatestaskrequest)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» taskId|string|false|none|none|
|» status|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|in_progress|
|status|complete|

<h2 id="tocS_BulkCertificatesTaskStatusResponse">BulkCertificatesTaskStatusResponse</h2>
<!-- backwards compatibility -->
<a id="schemabulkcertificatestaskstatusresponse"></a>
<a id="schema_BulkCertificatesTaskStatusResponse"></a>
<a id="tocSbulkcertificatestaskstatusresponse"></a>
<a id="tocsbulkcertificatestaskstatusresponse"></a>

```json
{
  "taskId": "string",
  "status": "pending",
  "batchDate": 0,
  "chunksPending": 0,
  "chunksTotal": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|taskId|string|false|none|ID of the bulk certificates creation task|
|status|string|false|none|status of the task|
|batchDate|number|false|none|batch start date time|
|chunksPending|number|false|none|number of certificate chunks yet to be completed|
|chunksTotal|number|false|none|total number of chunks in this batch|

#### Enumerated Values

|Property|Value|
|---|---|
|status|pending|
|status|complete|

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

