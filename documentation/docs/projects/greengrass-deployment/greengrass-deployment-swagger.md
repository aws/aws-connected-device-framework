---
title: "Connected Device Framework: Greengrass Code Deployment v1.0.0"
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

<h1 id="connected-device-framework-greengrass-code-deployment">Connected Device Framework: Greengrass Code Deployment v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Allows for remote deployment of Greengrass Core software using Ansible on physical devices.

<h1 id="connected-device-framework-greengrass-code-deployment-deployment-templates">Deployment Templates</h1>

A Template that provides specifies the configuration of a deployment

## List all available templates.

<a id="opIdlistTemplates"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /deploymentTemplates \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/deploymentTemplates', headers = headers)

print(r.json())

```

`GET /deploymentTemplates`

> Example responses

> 200 Response

```json
{
  "tempaltes": [
    {
      "name": "MyTemplate",
      "versionNo": 1,
      "createdAt": "2020-03-16T21:42:53.594Z",
      "updatedAt": "2020-03-16T21:42:53.594Z",
      "enabled": true
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  }
}
```

<h3 id="list-all-available-templates.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeploymentTemplatesList](#schemadeploymenttemplateslist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Creates a new template or updates an exisitng template.

<a id="opIdsaveTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /deploymentTemplates/{templateName} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/deploymentTemplates/{templateName}', headers = headers)

print(r.json())

```

`PUT /deploymentTemplates/{templateName}`

Defines a new template by specifying the type of the deployment "agentless" or "agentbased" and a source of the ansible playbook.

> Body parameter

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}
```

<h3 id="creates-a-new-template-or-updates-an-exisitng-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[DeploymentTemplate](#schemadeploymenttemplate)|false|none|
|templateName|path|string|true|Name of template|

> Example responses

> 201 Response

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}
```

<h3 id="creates-a-new-template-or-updates-an-exisitng-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created|[DeploymentTemplate](#schemadeploymenttemplate)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Conflict|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Find a specific deployment template

<a id="opIdgetTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /deploymentTemplates/{templateName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/deploymentTemplates/{templateName}', headers = headers)

print(r.json())

```

`GET /deploymentTemplates/{templateName}`

Returns a specific deployment template by template name.

<h3 id="find-a-specific-deployment-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateName|path|string|true|Name of template|

> Example responses

> 200 Response

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}
```

<h3 id="find-a-specific-deployment-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeploymentTemplate](#schemadeploymenttemplate)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-greengrass-code-deployment-activation">Activation</h1>

Activation represent SSM acitvation of greengrass core devices as hybrid instances

## Creates a device activation

<a id="opIdcreateActivation"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /devices/{deviceId}/activiations \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/devices/{deviceId}/activiations', headers = headers)

print(r.json())

```

`POST /devices/{deviceId}/activiations`

Creates an SSM activation for a greengrass core device

> Body parameter

```json
{
  "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
  "activationCode": "nxj3IC1HBquDVxM14Oqo",
  "activationRegion": "us-east-1"
}
```

<h3 id="creates-a-device-activation-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Activation](#schemaactivation)|false|none|
|deviceId|path|string|true|Device ID|

> Example responses

> 200 Response

```json
{
  "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
  "activationCode": "nxj3IC1HBquDVxM14Oqo",
  "activationRegion": "us-east-1"
}
```

<h3 id="creates-a-device-activation-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Activation](#schemaactivation)|

<aside class="success">
This operation does not require authentication
</aside>

## Find a specific activation for a device by id

<a id="opIdgetActivationById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId}/activations/{activationId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}/activations/{activationId}', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}/activations/{activationId}`

<h3 id="find-a-specific-activation-for-a-device-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|
|activationId|path|string|true|Device task Id|

> Example responses

> 200 Response

```json
{
  "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
  "activationCode": "nxj3IC1HBquDVxM14Oqo",
  "activationRegion": "us-east-1"
}
```

<h3 id="find-a-specific-activation-for-a-device-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Activation](#schemaactivation)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes a specific activation for a device by id

<a id="opIddeleteActivationById"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId}/activations/{activationId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}/activations/{activationId}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}/activations/{activationId}`

<h3 id="deletes-a-specific-activation-for-a-device-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|
|activationId|path|string|true|Device task Id|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-a-specific-activation-for-a-device-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-greengrass-code-deployment-deployment">Deployment</h1>

Deployment represent SSM State Manager association against devices managed as hybrid instances.

## Creates a device deployment

<a id="opIdcreateDeployment"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /devices/{deviceId}/deployemnts \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/devices/{deviceId}/deployemnts', headers = headers)

print(r.json())

```

`POST /devices/{deviceId}/deployemnts`

Creates an SSM state manager association for a greengrass core device

> Body parameter

```json
{
  "deviceId": "rpi-test-01-core",
  "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
  "createdAt": "2020-06-11T01:41:12.546Z",
  "updatedAt": "2020-06-11T01:41:12.546Z",
  "deploymentTemplateName": "budderfly-fc-deployment1",
  "deploymentStatus": "failed",
  "deploymentType": "agentbased"
}
```

<h3 id="creates-a-device-deployment-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Deployment](#schemadeployment)|false|none|
|deviceId|path|string|true|Device ID|

> Example responses

> 200 Response

```json
{
  "deviceId": "rpi-test-01-core",
  "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
  "createdAt": "2020-06-11T01:41:12.546Z",
  "updatedAt": "2020-06-11T01:41:12.546Z",
  "deploymentTemplateName": "budderfly-fc-deployment1",
  "deploymentStatus": "failed",
  "deploymentType": "agentbased"
}
```

<h3 id="creates-a-device-deployment-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Deployment](#schemadeployment)|

<aside class="success">
This operation does not require authentication
</aside>

## List all deployments by device

<a id="opIdgetDeploymentsById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId}/deployemnts \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}/deployemnts', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}/deployemnts`

<h3 id="list-all-deployments-by-device-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|

> Example responses

> 200 Response

```json
{
  "tempaltes": [
    {
      "deviceId": "rpi-test-01-core",
      "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
      "createdAt": "2020-06-11T01:41:12.546Z",
      "updatedAt": "2020-06-11T01:41:12.546Z",
      "deploymentTemplateName": "budderfly-fc-deployment1",
      "deploymentStatus": "failed",
      "deploymentType": "agentbased"
    }
  ]
}
```

<h3 id="list-all-deployments-by-device-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeploymentList](#schemadeploymentlist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Find a specific activation for a device by id

<a id="opIdgetDeploymentById"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId}/deployments/{deploymentId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}/deployments/{deploymentId}', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}/deployments/{deploymentId}`

<h3 id="find-a-specific-activation-for-a-device-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|
|deploymentId|path|string|true|Deployment ID|

> Example responses

> 200 Response

```json
{
  "deviceId": "rpi-test-01-core",
  "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
  "createdAt": "2020-06-11T01:41:12.546Z",
  "updatedAt": "2020-06-11T01:41:12.546Z",
  "deploymentTemplateName": "budderfly-fc-deployment1",
  "deploymentStatus": "failed",
  "deploymentType": "agentbased"
}
```

<h3 id="find-a-specific-activation-for-a-device-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Deployment](#schemadeployment)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes a specific deployment for a device by id

<a id="opIddeleteDeploymentById"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId}/deployments/{deploymentId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}/deployments/{deploymentId}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}/deployments/{deploymentId}`

<h3 id="deletes-a-specific-deployment-for-a-device-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|
|deploymentId|path|string|true|Deployment ID|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-a-specific-deployment-for-a-device-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_DeploymentTemplate">DeploymentTemplate</h2>
<!-- backwards compatibility -->
<a id="schemadeploymenttemplate"></a>
<a id="schema_DeploymentTemplate"></a>
<a id="tocSdeploymenttemplate"></a>
<a id="tocsdeploymenttemplate"></a>

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|name|string|false|none|Name of template.|
|type|string|false|none|type|
|source|object|false|none|none|
|» type|string|false|none|Type of source|
|» bucket|string|false|none|Bucket Name of the playbook source|
|» prefix|string|false|none|Bucket key prefix of the playbook source|
|versionNo|number|false|read-only|Auto-incrementing template version number.|
|createdAt|string(date-time)|false|read-only|Date/time the template was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the template was updated.|
|enabled|boolean|false|none|Whether the template is enabled for use.|

#### Enumerated Values

|Property|Value|
|---|---|
|type|agentless|
|type|agentbased|
|type|S3|

<h2 id="tocS_DeploymentTemplatesList">DeploymentTemplatesList</h2>
<!-- backwards compatibility -->
<a id="schemadeploymenttemplateslist"></a>
<a id="schema_DeploymentTemplatesList"></a>
<a id="tocSdeploymenttemplateslist"></a>
<a id="tocsdeploymenttemplateslist"></a>

```json
{
  "tempaltes": [
    {
      "name": "MyTemplate",
      "versionNo": 1,
      "createdAt": "2020-03-16T21:42:53.594Z",
      "updatedAt": "2020-03-16T21:42:53.594Z",
      "enabled": true
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|tempaltes|[[DeploymentTemplate](#schemadeploymenttemplate)]|false|none|A list of templates|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_Activation">Activation</h2>
<!-- backwards compatibility -->
<a id="schemaactivation"></a>
<a id="schema_Activation"></a>
<a id="tocSactivation"></a>
<a id="tocsactivation"></a>

```json
{
  "activationId": "a1102421-922f-46d5-9a85-bdbad8d90d6c",
  "activationCode": "nxj3IC1HBquDVxM14Oqo",
  "activationRegion": "us-east-1"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|deviceId|string|false|none|The id of target device|
|activationId|string|false|none|The id of the activaiton|
|activationRegion|string|false|none|The region where device activation has been created|

<h2 id="tocS_Deployment">Deployment</h2>
<!-- backwards compatibility -->
<a id="schemadeployment"></a>
<a id="schema_Deployment"></a>
<a id="tocSdeployment"></a>
<a id="tocsdeployment"></a>

```json
{
  "deviceId": "rpi-test-01-core",
  "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
  "createdAt": "2020-06-11T01:41:12.546Z",
  "updatedAt": "2020-06-11T01:41:12.546Z",
  "deploymentTemplateName": "budderfly-fc-deployment1",
  "deploymentStatus": "failed",
  "deploymentType": "agentbased"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|deviceId|string|false|none|The Id of the Device|
|deploymentId|string|false|none|The Id of the deployment|
|createdAt|string(date-time)|false|read-only|Date/time the group was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the group was updated.|
|deploymentTemplateName|string|false|none|Deployment Template Name|
|deploymentStatus|string|false|none|The status of the deployment|
|deploymentType|string|false|none|The type of deployment|

#### Enumerated Values

|Property|Value|
|---|---|
|deploymentStatus|pending|
|deploymentStatus|success|
|deploymentStatus|failed|
|deploymentType|agentless|
|deploymentType|agentbased|

<h2 id="tocS_DeploymentList">DeploymentList</h2>
<!-- backwards compatibility -->
<a id="schemadeploymentlist"></a>
<a id="schema_DeploymentList"></a>
<a id="tocSdeploymentlist"></a>
<a id="tocsdeploymentlist"></a>

```json
{
  "tempaltes": [
    {
      "deviceId": "rpi-test-01-core",
      "deploymentId": "a1b83c20-ab84-11ea-9634-37cb5e1c09aa",
      "createdAt": "2020-06-11T01:41:12.546Z",
      "updatedAt": "2020-06-11T01:41:12.546Z",
      "deploymentTemplateName": "budderfly-fc-deployment1",
      "deploymentStatus": "failed",
      "deploymentType": "agentbased"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|tempaltes|[[Deployment](#schemadeployment)]|false|none|A list of templates|

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

