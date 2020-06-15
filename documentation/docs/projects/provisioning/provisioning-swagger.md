---
title: "Connected Device Framework: Provisioning v1.0.0"
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

<h1 id="connected-device-framework-provisioning">Connected Device Framework: Provisioning v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

The provisioning service utilizes [AWS IoT Device Provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html) to provide both programmatic (just-in-time) and bulk device provisioning capabilities.  The provisioning service simplifies the use of AWS IoT Device Provisioning by allowing for the use of S3 based provisioning templates, and abstracting a standard interface over both device provisioning capabilities.

In addition, the CDF Provisioning Service allows for extending the capabilities of the AWS IoT Device Provisioning templating functionality.  To provide an example, the AWS IoT Device Provisioning allows for creating certificate resources by providing a certificate signing request (CSR), a certificate ID of an existing device certificate, or a device certificate created with a CA certificate registered with AWS IoT.  This service extends these capabilities by also providing the ability to automatically create (and return) new keys and certificates for a device.

If used in conjunction with the CDF Asset Library service, provisioning templates can be assigned to one or more hierarchies, and then the appropriate provisioning template obtained based on the location of an asset within a hierarchy.

<h1 id="connected-device-framework-provisioning-things">Things</h1>

The provisioning service provides the capability to provision a Thing in AWS IoT using AWS IoT Device Management's device onboarding feature. This allows for a provisioning template to be used to specify resources such as device certificates and device policies along with thing creation.

## Provision a new thing within the AWS IoT Device Registry

<a id="opIdprovisionThing"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /things \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/things', headers = headers)

print(r.json())

```

`POST /things`

> Body parameter

```json
{
  "provisioningTemplateId": "string",
  "parameters": {
    "property1": "string",
    "property2": "string"
  },
  "cdfProvisioningParameters": {}
}
```

<h3 id="provision-a-new-thing-within-the-aws-iot-device-registry-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[ProvisionRequest](#schemaprovisionrequest)|true|none|

> Example responses

> 201 Response

```json
{
  "certificatePem": "string",
  "publicKey": "string",
  "privateKey": "string",
  "resourceArns": {
    "policyLogicalName": "string",
    "certificate": "string",
    "thing": "string"
  }
}
```

<h3 id="provision-a-new-thing-within-the-aws-iot-device-registry-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|OK|[ProvisionResponse](#schemaprovisionresponse)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve details of a provisioned thing from the AWS IoT Device Registry

<a id="opIdgetThing"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /things/{thingName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/things/{thingName}', headers = headers)

print(r.json())

```

`GET /things/{thingName}`

<h3 id="retrieve-details-of-a-provisioned-thing-from-the-aws-iot-device-registry-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|thingName|path|string|true|Name of thing|

> Example responses

> 200 Response

```json
{
  "thingName": "string",
  "arn": "string",
  "thingType": "string",
  "attributes": {},
  "taskId": "string",
  "certificates": [
    {
      "certificateId": "string",
      "arn": "string",
      "certificateStatus": "ACTIVE",
      "certificatePem": "string"
    }
  ],
  "policies": [
    {
      "policyName": "string",
      "arn": "string",
      "policyDocument": "string"
    }
  ],
  "groups": [
    {
      "groupName": "string",
      "arn": "string",
      "attributes": {}
    }
  ]
}
```

<h3 id="retrieve-details-of-a-provisioned-thing-from-the-aws-iot-device-registry-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Thing](#schemathing)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete a thing from the AWS IoT Device Registry.

<a id="opIddeleteThing"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /things/{thingName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/things/{thingName}', headers = headers)

print(r.json())

```

`DELETE /things/{thingName}`

<h3 id="delete-a-thing-from-the-aws-iot-device-registry.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|thingName|path|string|true|Name of thing|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-a-thing-from-the-aws-iot-device-registry.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Sets the status of all attached certificates.

<a id="opIdupdateThingCertificates"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /things/{thingName}/certificates \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/things/{thingName}/certificates', headers = headers)

print(r.json())

```

`PATCH /things/{thingName}/certificates`

> Body parameter

```json
{
  "certificateStatus": "string"
}
```

<h3 id="sets-the-status-of-all-attached-certificates.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[PatchCertificateRequest](#schemapatchcertificaterequest)|true|none|
|thingName|path|string|true|Name of thing|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="sets-the-status-of-all-attached-certificates.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-provisioning-bulkregistrations">Bulkregistrations</h1>

The provisioning service provides the capability to register a number things in a bulk operation. This service uses AWS IoT Device Management's bulk registration capability to create an asyncronous registration task.

## Retrieve details about a bulk registration task

<a id="opIdgetBulkProvisionTask"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /bulkthings/{taskId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/bulkthings/{taskId}', headers = headers)

print(r.json())

```

`GET /bulkthings/{taskId}`

<h3 id="retrieve-details-about-a-bulk-registration-task-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|taskId|path|string|true|Id of the registration task|

> Example responses

> 200 Response

```json
{
  "taskId": "string",
  "status": "string",
  "percentageProgress": 0,
  "successCount": 0,
  "failureCount": 0,
  "creationDate": "2020-06-12T19:03:12Z",
  "lastModifiedDate": "2020-06-12T19:03:12Z"
}
```

<h3 id="retrieve-details-about-a-bulk-registration-task-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[BulkRegistrationTask](#schemabulkregistrationtask)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Bulk provision a set of new things within the AWS IoT Device Registry

<a id="opIdbulkProvisionThings"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /bulkthings \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/bulkthings', headers = headers)

print(r.json())

```

`POST /bulkthings`

> Body parameter

```json
{
  "provisioningTemplateId": "string",
  "parameters": [
    {
      "property1": "string",
      "property2": "string"
    }
  ]
}
```

<h3 id="bulk-provision-a-set-of-new-things-within-the-aws-iot-device-registry-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[BulkRegistrationRequest](#schemabulkregistrationrequest)|false|none|

> Example responses

> 201 Response

```json
{
  "taskId": "string",
  "status": "string",
  "percentageProgress": 0,
  "successCount": 0,
  "failureCount": 0,
  "creationDate": "2020-06-12T19:03:12Z",
  "lastModifiedDate": "2020-06-12T19:03:12Z"
}
```

<h3 id="bulk-provision-a-set-of-new-things-within-the-aws-iot-device-registry-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|OK|[BulkRegistrationTask](#schemabulkregistrationtask)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_Thing">Thing</h2>
<!-- backwards compatibility -->
<a id="schemathing"></a>
<a id="schema_Thing"></a>
<a id="tocSthing"></a>
<a id="tocsthing"></a>

```json
{
  "thingName": "string",
  "arn": "string",
  "thingType": "string",
  "attributes": {},
  "taskId": "string",
  "certificates": [
    {
      "certificateId": "string",
      "arn": "string",
      "certificateStatus": "ACTIVE",
      "certificatePem": "string"
    }
  ],
  "policies": [
    {
      "policyName": "string",
      "arn": "string",
      "policyDocument": "string"
    }
  ],
  "groups": [
    {
      "groupName": "string",
      "arn": "string",
      "attributes": {}
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|thingName|string|false|none|none|
|arn|string|false|none|none|
|thingType|string|false|none|none|
|attributes|object|false|none|none|
|taskId|string|false|none|none|
|certificates|[[Certificate](#schemacertificate)]|false|none|none|
|policies|[[IotPolicy](#schemaiotpolicy)]|false|none|none|
|groups|[[IotGroup](#schemaiotgroup)]|false|none|none|

<h2 id="tocS_Certificate">Certificate</h2>
<!-- backwards compatibility -->
<a id="schemacertificate"></a>
<a id="schema_Certificate"></a>
<a id="tocScertificate"></a>
<a id="tocscertificate"></a>

```json
{
  "certificateId": "string",
  "arn": "string",
  "certificateStatus": "ACTIVE",
  "certificatePem": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|certificateId|string|false|none|none|
|arn|string|false|none|none|
|certificateStatus|string|false|none|none|
|certificatePem|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|certificateStatus|ACTIVE|
|certificateStatus|INACTIVE|

<h2 id="tocS_IotPolicy">IotPolicy</h2>
<!-- backwards compatibility -->
<a id="schemaiotpolicy"></a>
<a id="schema_IotPolicy"></a>
<a id="tocSiotpolicy"></a>
<a id="tocsiotpolicy"></a>

```json
{
  "policyName": "string",
  "arn": "string",
  "policyDocument": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|policyName|string|false|none|none|
|arn|string|false|none|none|
|policyDocument|string|false|none|none|

<h2 id="tocS_IotGroup">IotGroup</h2>
<!-- backwards compatibility -->
<a id="schemaiotgroup"></a>
<a id="schema_IotGroup"></a>
<a id="tocSiotgroup"></a>
<a id="tocsiotgroup"></a>

```json
{
  "groupName": "string",
  "arn": "string",
  "attributes": {}
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|groupName|string|false|none|none|
|arn|string|false|none|none|
|attributes|object|false|none|none|

<h2 id="tocS_ProvisionRequest">ProvisionRequest</h2>
<!-- backwards compatibility -->
<a id="schemaprovisionrequest"></a>
<a id="schema_ProvisionRequest"></a>
<a id="tocSprovisionrequest"></a>
<a id="tocsprovisionrequest"></a>

```json
{
  "provisioningTemplateId": "string",
  "parameters": {
    "property1": "string",
    "property2": "string"
  },
  "cdfProvisioningParameters": {}
}

```

Provisiong a new thing request

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|provisioningTemplateId|string|false|none|Id of an existing provisioning template|
|parameters|object|false|none|Map of key value pairs for all parameters defined in the provisioning template.|
|» **additionalProperties**|string|false|none|none|
|cdfProvisioningParameters|object|false|none|Optional parameters used by CDF in provisioning process.|

<h2 id="tocS_ProvisionResponse">ProvisionResponse</h2>
<!-- backwards compatibility -->
<a id="schemaprovisionresponse"></a>
<a id="schema_ProvisionResponse"></a>
<a id="tocSprovisionresponse"></a>
<a id="tocsprovisionresponse"></a>

```json
{
  "certificatePem": "string",
  "publicKey": "string",
  "privateKey": "string",
  "resourceArns": {
    "policyLogicalName": "string",
    "certificate": "string",
    "thing": "string"
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|certificatePem|string|false|none|none|
|publicKey|string|false|none|none|
|privateKey|string|false|none|none|
|resourceArns|object|false|none|none|
|» policyLogicalName|string|false|none|none|
|» certificate|string|false|none|none|
|» thing|string|false|none|none|

<h2 id="tocS_BulkRegistrationTask">BulkRegistrationTask</h2>
<!-- backwards compatibility -->
<a id="schemabulkregistrationtask"></a>
<a id="schema_BulkRegistrationTask"></a>
<a id="tocSbulkregistrationtask"></a>
<a id="tocsbulkregistrationtask"></a>

```json
{
  "taskId": "string",
  "status": "string",
  "percentageProgress": 0,
  "successCount": 0,
  "failureCount": 0,
  "creationDate": "2020-06-12T19:03:12Z",
  "lastModifiedDate": "2020-06-12T19:03:12Z"
}

```

Thing bulk registration task

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|taskId|string|false|none|Id of the registration task|
|status|string|false|none|Status of the task|
|percentageProgress|integer(int32)|false|none|Percentage complete|
|successCount|integer(int32)|false|none|No. assets that were provisioned successful|
|failureCount|integer(int32)|false|none|No. assets that failed during provisioning|
|creationDate|string(date-time)|false|none|Date/time the task was created|
|lastModifiedDate|string(date-time)|false|none|Date/time the task was last updated|

<h2 id="tocS_BulkRegistrationTaskList">BulkRegistrationTaskList</h2>
<!-- backwards compatibility -->
<a id="schemabulkregistrationtasklist"></a>
<a id="schema_BulkRegistrationTaskList"></a>
<a id="tocSbulkregistrationtasklist"></a>
<a id="tocsbulkregistrationtasklist"></a>

```json
{
  "tasks": [
    {
      "taskId": "string",
      "status": "string",
      "percentageProgress": 0,
      "successCount": 0,
      "failureCount": 0,
      "creationDate": "2020-06-12T19:03:12Z",
      "lastModifiedDate": "2020-06-12T19:03:12Z"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|tasks|[[BulkRegistrationTask](#schemabulkregistrationtask)]|false|none|a list of bulk registration tasks|

<h2 id="tocS_BulkRegistrationRequest">BulkRegistrationRequest</h2>
<!-- backwards compatibility -->
<a id="schemabulkregistrationrequest"></a>
<a id="schema_BulkRegistrationRequest"></a>
<a id="tocSbulkregistrationrequest"></a>
<a id="tocsbulkregistrationrequest"></a>

```json
{
  "provisioningTemplateId": "string",
  "parameters": [
    {
      "property1": "string",
      "property2": "string"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|provisioningTemplateId|string|false|none|Id of an existing provisioning template|
|parameters|[object]|false|none|List containing a map of key value pairs for all parameters defined in the provisioning template.  Each element in the list represents a new thing to provision.|
|» **additionalProperties**|string|false|none|none|

<h2 id="tocS_PatchCertificateRequest">PatchCertificateRequest</h2>
<!-- backwards compatibility -->
<a id="schemapatchcertificaterequest"></a>
<a id="schema_PatchCertificateRequest"></a>
<a id="tocSpatchcertificaterequest"></a>
<a id="tocspatchcertificaterequest"></a>

```json
{
  "certificateStatus": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|certificateStatus|string|false|none|Certificate status|

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

