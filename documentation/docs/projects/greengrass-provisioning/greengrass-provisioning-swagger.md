---
title: "Connected Device Framework: Greengrass Provisioning v1.0.0"
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

<h1 id="connected-device-framework-greengrass-provisioning">Connected Device Framework: Greengrass Provisioning v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

Allows for  bulk provisioning of Greengrass Group's and their related resource definitions, and bulk updating of Greengrass Group's.

<h1 id="connected-device-framework-greengrass-provisioning-templates">Templates</h1>

An existing Greengrass group may be marked as a template. The template may then be used to create new Greengrass group instances. The template's connector, lambda, logger, resource and non-device specific resource definitions are linked to the new Greengrass groups.  Templates are referenced by a human readable name.

## List all available templates.

<a id="opIdlistTemplates"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /templates \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/templates', headers = headers)

print(r.json())

```

`GET /templates`

> Example responses

> 200 Response

```json
{
  "templates": [
    {
      "name": "MyTemplate",
      "versionNo": 1,
      "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87",
      "groupVersionId": "6d9e817d-050e-4ded-8301-e63fdbe02f78",
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
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[TemplateList](#schematemplatelist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Create a new template, or update an existing template.

<a id="opIdsaveTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /templates/{templateName} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/templates/{templateName}', headers = headers)

print(r.json())

```

`PUT /templates/{templateName}`

Defines a new template by marking a pre-existing Greengrass group (identified by its group id) as a template.  For existing templates, updates the specific Greengrass group version ID.
If no Greengrass group version ID is provided when creating a template, the latest version of ID of the Greengrass group is automatically assigned.

> Body parameter

```json
{
  "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87"
}
```

<h3 id="create-a-new-template,-or-update-an-existing-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Template](#schematemplate)|false|none|
|templateName|path|string|true|Name of template|

> Example responses

> 201 Response

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87",
  "groupVersionId": "6d9e817d-050e-4ded-8301-e63fdbe02f78",
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}
```

<h3 id="create-a-new-template,-or-update-an-existing-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created|[Template](#schematemplate)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Conflict|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Find a specific template

<a id="opIdgetTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /templates/{templateName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/templates/{templateName}', headers = headers)

print(r.json())

```

`GET /templates/{templateName}`

Returns a specific template by template name.

<h3 id="find-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateName|path|string|true|Name of template|

> Example responses

> 200 Response

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87",
  "groupVersionId": "6d9e817d-050e-4ded-8301-e63fdbe02f78",
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}
```

<h3 id="find-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Template](#schematemplate)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-greengrass-provisioning-groups">Groups</h1>

Greengrass groups are created for a pre-defined template.  Greengrass groups are identified by their human readable name.

## Create new Greengrass groups from a template.

<a id="opIdcreateGroups"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /groups \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/groups', headers = headers)

print(r.json())

```

`POST /groups`

Create 1 or more new Greengrass groups based on a pre-defined template.

> Body parameter

```json
{
  "groups": [
    {
      "name": "my-group-one",
      "templateName": "my-template"
    },
    {
      "name": "my-group-two",
      "templateName": "my-template"
    },
    {
      "name": "my-group-three",
      "templateName": "my-other-template"
    }
  ]
}
```

<h3 id="create-new-greengrass-groups-from-a-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[GroupList](#schemagrouplist)|false|none|

> Example responses

> 200 Response

```json
{
  "groups": [
    {
      "name": "my-greengrass-group-1",
      "templateName": "my-greengrass-template",
      "id": "64de8dbc-1335-4638-bb8a-3ac99a03ca99",
      "versionId": "39efd05b-8709-4e1f-ba42-dcb6b40d4163",
      "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/64de8dbc-1335-4638-bb8a-3ac99a03ca99",
      "templateVersionNo": 1,
      "versionNo": 1,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z",
      "deployed": false
    },
    {
      "name": "my-greengrass-group-2",
      "templateName": "my-greengrass-template",
      "id": "81506352-79cc-4cd4-8145-3802217815d7",
      "versionId": "6b63a996-ceef-4b4d-99b7-197d05172673",
      "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/81506352-79cc-4cd4-8145-3802217815d7",
      "templateVersionNo": 1,
      "versionNo": 1,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z",
      "deployed": false
    }
  ]
}
```

<h3 id="create-new-greengrass-groups-from-a-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[GroupList](#schemagrouplist)|

<aside class="success">
This operation does not require authentication
</aside>

## Find a specific Greengrass group by its name.

<a id="opIdgetGroupByName"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupName}', headers = headers)

print(r.json())

```

`GET /groups/{groupName}`

<h3 id="find-a-specific-greengrass-group-by-its-name.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|groupName|path|string|true|Name of Greengrass group|

> Example responses

> 200 Response

```json
{
  "name": "my-greengrass-group",
  "templateName": "my-greengrass-template",
  "id": "64de8dbc-1335-4638-bb8a-3ac99a03ca99",
  "versionId": "39efd05b-8709-4e1f-ba42-dcb6b40d4163",
  "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/64de8dbc-1335-4638-bb8a-3ac99a03ca99",
  "templateVersionNo": 1,
  "versionNo": 1,
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z",
  "deployed": false
}
```

<h3 id="find-a-specific-greengrass-group-by-its-name.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Group](#schemagroup)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-greengrass-provisioning-devices">Devices</h1>

Devices, along with device specific subscriptions, may be added to Greengrass groups managed by this service.  As these are added in bulk, an asynchronous task is created which will create the requested devices.

## Associate devices with existing Greengrass groups.

<a id="opIdassociateDevicesWithGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /groups/{groupName}/deviceTasks \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/groups/{groupName}/deviceTasks', headers = headers)

print(r.json())

```

`POST /groups/{groupName}/deviceTasks`

Creates an asynchyonous task to create (if not already existing) and associate devices with existing Greengrass groups.  Optionally, any new device subscriptions may be passed with this call too.  The returned `taskid` may be used to look up the task status.

<h3 id="associate-devices-with-existing-greengrass-groups.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|groupName|path|string|true|Name of Greengrass group|

> Example responses

> 202 Response

```json
{
  "taskId": "hshjd7huhu3jid",
  "groupName": "my-greengrass-group",
  "status": "InProgress",
  "devices": [
    {
      "thingName": "my-device",
      "type": "device",
      "provisioningTemplate": "my-template",
      "provisioningParameters": {
        "ThingName": "my-device"
      },
      "cdfProvisioningParameters": {
        "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
        "certInfo": {
          "country": "US"
        }
      },
      "syncShadow": true,
      "artifacts": {
        "certificate": {
          "bucket": "my-bucket",
          "key": "certs/c123",
          "createdAt": "2020-06-08T19:35:54.327Z"
        }
      },
      "subscriptions": [
        {
          "id": "sub-1",
          "source": "cloud",
          "subject": "dt/us/my-device/#",
          "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
          "deployed": true,
          "createdAt": "2020-06-08T19:35:54.327Z",
          "updatedAt": "2020-06-08T19:35:54.327Z"
        }
      ],
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ]
}
```

<h3 id="associate-devices-with-existing-greengrass-groups.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|202|[Accepted](https://tools.ietf.org/html/rfc7231#section-6.3.3)|Accepted|[DeviceTaskSummary](#schemadevicetasksummary)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve a device task summary.

<a id="opIdgetDeviceAssociationTask"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupName}/deviceTasks/{deviceTaskId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupName}/deviceTasks/{deviceTaskId}', headers = headers)

print(r.json())

```

`GET /groups/{groupName}/deviceTasks/{deviceTaskId}`

<h3 id="retrieve-a-device-task-summary.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|groupName|path|string|true|Name of Greengrass group|
|deviceTaskId|path|string|true|Device task Id|

> Example responses

> 200 Response

```json
{
  "taskId": "hshjd7huhu3jid",
  "groupName": "my-greengrass-group",
  "status": "InProgress",
  "devices": [
    {
      "thingName": "my-device",
      "type": "device",
      "provisioningTemplate": "my-template",
      "provisioningParameters": {
        "ThingName": "my-device"
      },
      "cdfProvisioningParameters": {
        "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
        "certInfo": {
          "country": "US"
        }
      },
      "syncShadow": true,
      "artifacts": {
        "certificate": {
          "bucket": "my-bucket",
          "key": "certs/c123",
          "createdAt": "2020-06-08T19:35:54.327Z"
        }
      },
      "subscriptions": [
        {
          "id": "sub-1",
          "source": "cloud",
          "subject": "dt/us/my-device/#",
          "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
          "deployed": true,
          "createdAt": "2020-06-08T19:35:54.327Z",
          "updatedAt": "2020-06-08T19:35:54.327Z"
        }
      ],
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ]
}
```

<h3 id="retrieve-a-device-task-summary.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeviceTaskSummary](#schemadevicetasksummary)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieves details about of specific device, including any associated artifacts.

<a id="opIdgetDevice"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}`

<h3 id="retrieves-details-about-of-specific-device,-including-any-associated-artifacts.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Device ID|

> Example responses

> 200 Response

```json
{
  "thingName": "my-device",
  "type": "device",
  "provisioningTemplate": "my-template",
  "provisioningParameters": {
    "ThingName": "my-device"
  },
  "cdfProvisioningParameters": {
    "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
    "certInfo": {
      "country": "US"
    }
  },
  "syncShadow": true,
  "artifacts": {
    "certificate": {
      "bucket": "my-bucket",
      "key": "certs/c123",
      "createdAt": "2020-06-08T19:35:54.327Z"
    }
  },
  "subscriptions": [
    {
      "id": "sub-1",
      "source": "cloud",
      "subject": "dt/us/my-device/#",
      "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
      "deployed": true,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "deployed": true,
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}
```

<h3 id="retrieves-details-about-of-specific-device,-including-any-associated-artifacts.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeviceItem](#schemadeviceitem)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-greengrass-provisioning-deployments">Deployments</h1>

Once a Greengrass group has been configured, a deployment may be executed.

## Deploy a set of pre-configured Greengrass groups.

<a id="opIddeployGroups"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /deploymentTasks \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/deploymentTasks', headers = headers)

print(r.json())

```

`POST /deploymentTasks`

Create an asynchronous deployment task which is responsible for deploying provided Greengrass groups.

> Example responses

> 202 Response

```json
{
  "taskId": "hshjd7huhu3jid",
  "bulkDeploymentId": "9910c988-9d9a-4b45-b950-23c877dddb11",
  "bulkDeploymentStatus": "Completed",
  "taskStatus": "Success",
  "deployments": [
    {
      "groupName": "my-greengrass-group",
      "groupId": "f4571cb4-5865-4c2f-b58e-402525197a85",
      "groupVersionId": "6a0a194f-1c8e-418e-9b00-48031e1a7fe2",
      "bulkDeploymentId": "ea66d48d-ab11-4330-9624-99797e5dfc6f",
      "deploymentId": "ebc83cfc-922f-4ac9-af01-269629d4e8f8",
      "deploymentType": "NewDeployment",
      "deploymentStatus": "Success",
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}
```

<h3 id="deploy-a-set-of-pre-configured-greengrass-groups.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|202|[Accepted](https://tools.ietf.org/html/rfc7231#section-6.3.3)|OK|[DeploymentTaskSummary](#schemadeploymenttasksummary)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieves details of a specific deployment task.

<a id="opIdgetDeplymentTask"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /deploymentTasks/{deploymentTaskId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/deploymentTasks/{deploymentTaskId}', headers = headers)

print(r.json())

```

`GET /deploymentTasks/{deploymentTaskId}`

<h3 id="retrieves-details-of-a-specific-deployment-task.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deploymentTaskId|path|string|true|Deployment task ID|

> Example responses

> 200 Response

```json
{
  "taskId": "hshjd7huhu3jid",
  "bulkDeploymentId": "9910c988-9d9a-4b45-b950-23c877dddb11",
  "bulkDeploymentStatus": "Completed",
  "taskStatus": "Success",
  "deployments": [
    {
      "groupName": "my-greengrass-group",
      "groupId": "f4571cb4-5865-4c2f-b58e-402525197a85",
      "groupVersionId": "6a0a194f-1c8e-418e-9b00-48031e1a7fe2",
      "bulkDeploymentId": "ea66d48d-ab11-4330-9624-99797e5dfc6f",
      "deploymentId": "ebc83cfc-922f-4ac9-af01-269629d4e8f8",
      "deploymentType": "NewDeployment",
      "deploymentStatus": "Success",
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}
```

<h3 id="retrieves-details-of-a-specific-deployment-task.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[DeploymentTaskSummary](#schemadeploymenttasksummary)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_Template">Template</h2>
<!-- backwards compatibility -->
<a id="schematemplate"></a>
<a id="schema_Template"></a>
<a id="tocStemplate"></a>
<a id="tocstemplate"></a>

```json
{
  "name": "MyTemplate",
  "versionNo": 1,
  "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87",
  "groupVersionId": "6d9e817d-050e-4ded-8301-e63fdbe02f78",
  "createdAt": "2020-03-16T21:42:53.594Z",
  "updatedAt": "2020-03-16T21:42:53.594Z",
  "enabled": true
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|name|string|false|none|Name of template.|
|versionNo|number|false|read-only|Auto-incrementing template version number.|
|groupId|string|false|none|The ID of the Greengrass Group being used as a template.|
|groupVersionId|string|false|none|The version ID of the Greengrass Group being used as a template.|
|createdAt|string(date-time)|false|read-only|Date/time the template was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the template was updated.|
|enabled|boolean|false|none|Whether the template is enabled for use.|

<h2 id="tocS_TemplateList">TemplateList</h2>
<!-- backwards compatibility -->
<a id="schematemplatelist"></a>
<a id="schema_TemplateList"></a>
<a id="tocStemplatelist"></a>
<a id="tocstemplatelist"></a>

```json
{
  "templates": [
    {
      "name": "MyTemplate",
      "versionNo": 1,
      "groupId": "c71bf09a-e0d7-4bb9-8a45-cdb9933e8d87",
      "groupVersionId": "6d9e817d-050e-4ded-8301-e63fdbe02f78",
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
|templates|[[Template](#schematemplate)]|false|none|A list of templates|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_Group">Group</h2>
<!-- backwards compatibility -->
<a id="schemagroup"></a>
<a id="schema_Group"></a>
<a id="tocSgroup"></a>
<a id="tocsgroup"></a>

```json
{
  "name": "my-greengrass-group",
  "templateName": "my-greengrass-template",
  "id": "64de8dbc-1335-4638-bb8a-3ac99a03ca99",
  "versionId": "39efd05b-8709-4e1f-ba42-dcb6b40d4163",
  "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/64de8dbc-1335-4638-bb8a-3ac99a03ca99",
  "templateVersionNo": 1,
  "versionNo": 1,
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z",
  "deployed": false
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|name|string|false|none|Name of Greengrass group.|
|templateName|string|false|none|Name of template used to create the Greengrass group.|
|templateVersionNo|number|false|read-only|Version no. of template used to create the Greengrass group.|
|id|string|false|read-only|Greengrass group Id.|
|versionId|string|false|read-only|Greengrass group version Id.|
|arn|string|false|read-only|Greengrass group Arn.|
|versionNo|string|false|read-only|Internal tracked version no. of the greengrass group.|
|deployed|boolean|false|read-only|Whether the Greengrass group has been deployed or not.|
|createdAt|string(date-time)|false|read-only|Date/time the group was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the group was updated.|

<h2 id="tocS_GreengrassSubscriptionItem">GreengrassSubscriptionItem</h2>
<!-- backwards compatibility -->
<a id="schemagreengrasssubscriptionitem"></a>
<a id="schema_GreengrassSubscriptionItem"></a>
<a id="tocSgreengrasssubscriptionitem"></a>
<a id="tocsgreengrasssubscriptionitem"></a>

```json
{
  "id": "string",
  "source": "string",
  "subject": "string",
  "target": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|id|string|false|none|Unique ID|
|source|string|false|none|The source of the subscription. Can be a thing ARN, the ARN of a Lambda function alias (recommended) or version, a connector ARN, 'cloud' (which represents AWS IoT), or 'GGShadowService'. If you specify a Lambda function, this ARN should match the ARN used to add the function to the Greengrass group.|
|subject|string|false|none|The MQTT topic used to route the message.|
|target|string|false|none|Where the message is sent. Can be a thing ARN, the ARN of a Lambda function alias (recommended) or version, a connector ARN, 'cloud' (which represents AWS IoT), or 'GGShadowService'. If you specify a Lambda function, this ARN should match the ARN used to add the function to the Greengrass group.|

<h2 id="tocS_DeviceItem">DeviceItem</h2>
<!-- backwards compatibility -->
<a id="schemadeviceitem"></a>
<a id="schema_DeviceItem"></a>
<a id="tocSdeviceitem"></a>
<a id="tocsdeviceitem"></a>

```json
{
  "thingName": "my-device",
  "type": "device",
  "provisioningTemplate": "my-template",
  "provisioningParameters": {
    "ThingName": "my-device"
  },
  "cdfProvisioningParameters": {
    "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
    "certInfo": {
      "country": "US"
    }
  },
  "syncShadow": true,
  "artifacts": {
    "certificate": {
      "bucket": "my-bucket",
      "key": "certs/c123",
      "createdAt": "2020-06-08T19:35:54.327Z"
    }
  },
  "subscriptions": [
    {
      "id": "sub-1",
      "source": "cloud",
      "subject": "dt/us/my-device/#",
      "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
      "deployed": true,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "deployed": true,
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|thingName|string|false|none|Thing name.|
|type|string|false|none|Greengrass device type.|
|provisioningTemplate|string|false|none|Name of provisioning template to use to create the device.|
|provisioningParameters|object|false|none|Key value map of parameters required by the provisioning template.|
|» **additionalProperties**|string|false|none|none|
|cdfProvisioningParameters|object|false|none|Key value map of parameters required by the provisioning template.|
|» caId|string|false|none|CA ID to use (if a certificate has been requested to be created by CDF on behalf of the device)|
|» certInfo|object|false|none|Certificate attributes (if a certificate has been requested to be created by CDF on behalf of the device)|
|»» commonName|string|false|none|none|
|»» organization|string|false|none|none|
|»» organizationalUnit|string|false|none|none|
|»» locality|string|false|none|none|
|»» stateName|string|false|none|none|
|»» country|string|false|none|none|
|»» emailAddress|string|false|none|none|
|syncShadow|boolean|false|none|If true, the core's local shadow is synced with the cloud automatically.|
|artifacts|object|false|none|Any artifacts, such as certificates and keys, that may hae been created by the device provisioning process.|
|» **additionalProperties**|object|false|none|none|
|»» bucket|string|false|read-only|Bucket where artifact is stored.|
|»» key|string|false|read-only|Key where artifact is stored.|
|»» createdAt|string(date-time)|false|read-only|Date/time the artifact was created.|
|subscriptions|[[GreengrassSubscriptionItem](#schemagreengrasssubscriptionitem)]|false|none|Any subscriptions for this device created by this service.|
|deployed|boolean|false|read-only|Whether the device has been deployed or not.|
|createdAt|string(date-time)|false|read-only|Date/time the device was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the device was updated.|

#### Enumerated Values

|Property|Value|
|---|---|
|type|core|
|type|device|

<h2 id="tocS_DeviceTaskItem">DeviceTaskItem</h2>
<!-- backwards compatibility -->
<a id="schemadevicetaskitem"></a>
<a id="schema_DeviceTaskItem"></a>
<a id="tocSdevicetaskitem"></a>
<a id="tocsdevicetaskitem"></a>

```json
{
  "thingName": "my-device",
  "type": "device",
  "provisioningTemplate": "my-template",
  "provisioningParameters": {
    "ThingName": "my-device"
  },
  "cdfProvisioningParameters": {
    "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
    "certInfo": {
      "country": "US"
    }
  },
  "syncShadow": true,
  "artifacts": {
    "certificate": {
      "bucket": "my-bucket",
      "key": "certs/c123",
      "createdAt": "2020-06-08T19:35:54.327Z"
    }
  },
  "subscriptions": [
    {
      "id": "sub-1",
      "source": "cloud",
      "subject": "dt/us/my-device/#",
      "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
      "deployed": true,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "deployed": true,
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z",
  "status": "Success"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[DeviceItem](#schemadeviceitem)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» status|string|false|read-only|Task status.|
|» statusMessage|string|false|read-only|Descriptive message regarding the status, such as an error message.|

#### Enumerated Values

|Property|Value|
|---|---|
|status|Waiting|
|status|InProgress|
|status|Success|
|status|Failure|

<h2 id="tocS_DeviceTaskSummary">DeviceTaskSummary</h2>
<!-- backwards compatibility -->
<a id="schemadevicetasksummary"></a>
<a id="schema_DeviceTaskSummary"></a>
<a id="tocSdevicetasksummary"></a>
<a id="tocsdevicetasksummary"></a>

```json
{
  "taskId": "hshjd7huhu3jid",
  "groupName": "my-greengrass-group",
  "status": "InProgress",
  "devices": [
    {
      "thingName": "my-device",
      "type": "device",
      "provisioningTemplate": "my-template",
      "provisioningParameters": {
        "ThingName": "my-device"
      },
      "cdfProvisioningParameters": {
        "caId": "3d2ecfdb0eba2898626291e7e18a37cee791dbc81940a39e8ce922f9ff2feb32",
        "certInfo": {
          "country": "US"
        }
      },
      "syncShadow": true,
      "artifacts": {
        "certificate": {
          "bucket": "my-bucket",
          "key": "certs/c123",
          "createdAt": "2020-06-08T19:35:54.327Z"
        }
      },
      "subscriptions": [
        {
          "id": "sub-1",
          "source": "cloud",
          "subject": "dt/us/my-device/#",
          "target": "arn:aws:iot:us-west-2:123456789012:thing/my-device",
          "deployed": true,
          "createdAt": "2020-06-08T19:35:54.327Z",
          "updatedAt": "2020-06-08T19:35:54.327Z"
        }
      ],
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|taskId|string|false|none|Unique ID of the task.|
|groupName|string|false|none|Name of Greengrass group the task was created for.|
|status|string|false|read-only|Task status.|
|statusMessage|string|false|read-only|Descriptive message regarding the status, such as an error message.|
|devices|[[DeviceTaskItem](#schemadevicetaskitem)]|false|read-only|Devices managed via this task.|
|createdAt|string(date-time)|false|read-only|Date/time the group was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the group was updated.|

#### Enumerated Values

|Property|Value|
|---|---|
|status|Waiting|
|status|InProgress|
|status|Success|
|status|Failure|

<h2 id="tocS_GroupList">GroupList</h2>
<!-- backwards compatibility -->
<a id="schemagrouplist"></a>
<a id="schema_GroupList"></a>
<a id="tocSgrouplist"></a>
<a id="tocsgrouplist"></a>

```json
{
  "groups": [
    {
      "name": "my-greengrass-group-1",
      "templateName": "my-greengrass-template",
      "id": "64de8dbc-1335-4638-bb8a-3ac99a03ca99",
      "versionId": "39efd05b-8709-4e1f-ba42-dcb6b40d4163",
      "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/64de8dbc-1335-4638-bb8a-3ac99a03ca99",
      "templateVersionNo": 1,
      "versionNo": 1,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z",
      "deployed": false
    },
    {
      "name": "my-greengrass-group-2",
      "templateName": "my-greengrass-template",
      "id": "81506352-79cc-4cd4-8145-3802217815d7",
      "versionId": "6b63a996-ceef-4b4d-99b7-197d05172673",
      "arn": "arn:aws:greengrass:us-west-2:123456789012:/greengrass/groups/81506352-79cc-4cd4-8145-3802217815d7",
      "templateVersionNo": 1,
      "versionNo": 1,
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z",
      "deployed": false
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|groups|[[Group](#schemagroup)]|false|none|A list of groups|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_DeviceDeploymentItem">DeviceDeploymentItem</h2>
<!-- backwards compatibility -->
<a id="schemadevicedeploymentitem"></a>
<a id="schema_DeviceDeploymentItem"></a>
<a id="tocSdevicedeploymentitem"></a>
<a id="tocsdevicedeploymentitem"></a>

```json
{
  "thingName": "string",
  "deploymentStatus": "string",
  "statusMessage": "string",
  "createdAt": "2020-06-12T19:03:13Z",
  "updatedAt": "2020-06-12T19:03:13Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|thingName|string|false|none|Thing name.|
|deploymentStatus|string|false|none|Statius of device deployment. Note this is managed by this service's sibling Greegrass Device provisioning service.|
|statusMessage|string|false|read-only|Descriptive message regarding the status, such as an error message.|
|createdAt|string(date-time)|false|read-only|Date/time the device was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the device was updated.|

<h2 id="tocS_DeploymentItem">DeploymentItem</h2>
<!-- backwards compatibility -->
<a id="schemadeploymentitem"></a>
<a id="schema_DeploymentItem"></a>
<a id="tocSdeploymentitem"></a>
<a id="tocsdeploymentitem"></a>

```json
{
  "groupName": "my-greengrass-group",
  "groupId": "f4571cb4-5865-4c2f-b58e-402525197a85",
  "groupVersionId": "6a0a194f-1c8e-418e-9b00-48031e1a7fe2",
  "bulkDeploymentId": "ea66d48d-ab11-4330-9624-99797e5dfc6f",
  "deploymentId": "ebc83cfc-922f-4ac9-af01-269629d4e8f8",
  "deploymentType": "NewDeployment",
  "deploymentStatus": "Success",
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|groupName|string|false|none|Greengrass group name.|
|groupId|string|false|none|Greengrass group ID.|
|groupVersionId|string|false|none|Greengrass group version ID.|
|bulkDeploymentId|string|false|read-only|Associated Greengrass bulk deployment ID.|
|deploymentId|string|false|read-only|Associated individual Greengrass group deployment ID.|
|deploymentType|string|false|none|Type of Greengrass deployment to perform.|
|devices|[[DeviceDeploymentItem](#schemadevicedeploymentitem)]|false|none|Devices deployed as part of this deployment.|
|deploymentStatus|string|false|read-only|The deployment task status.|
|statusMessage|string|false|read-only|Descriptive message regarding the status, such as an error message.|
|createdAt|string(date-time)|false|read-only|Date/time the deployment was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the deployment was updated.|

#### Enumerated Values

|Property|Value|
|---|---|
|deploymentType|NewDeployment|
|deploymentType|Redeployment|
|deploymentType|ResetDeployment|
|deploymentType|ForceResetDeployment|
|deploymentStatus|Waiting|
|deploymentStatus|Created|
|deploymentStatus|Building|
|deploymentStatus|InProgress|
|deploymentStatus|Success|
|deploymentStatus|Failure|

<h2 id="tocS_DeploymentTaskSummary">DeploymentTaskSummary</h2>
<!-- backwards compatibility -->
<a id="schemadeploymenttasksummary"></a>
<a id="schema_DeploymentTaskSummary"></a>
<a id="tocSdeploymenttasksummary"></a>
<a id="tocsdeploymenttasksummary"></a>

```json
{
  "taskId": "hshjd7huhu3jid",
  "bulkDeploymentId": "9910c988-9d9a-4b45-b950-23c877dddb11",
  "bulkDeploymentStatus": "Completed",
  "taskStatus": "Success",
  "deployments": [
    {
      "groupName": "my-greengrass-group",
      "groupId": "f4571cb4-5865-4c2f-b58e-402525197a85",
      "groupVersionId": "6a0a194f-1c8e-418e-9b00-48031e1a7fe2",
      "bulkDeploymentId": "ea66d48d-ab11-4330-9624-99797e5dfc6f",
      "deploymentId": "ebc83cfc-922f-4ac9-af01-269629d4e8f8",
      "deploymentType": "NewDeployment",
      "deploymentStatus": "Success",
      "createdAt": "2020-06-08T19:35:54.327Z",
      "updatedAt": "2020-06-08T19:35:54.327Z"
    }
  ],
  "createdAt": "2020-06-08T19:35:54.327Z",
  "updatedAt": "2020-06-08T19:35:54.327Z"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|taskId|string|false|none|Unique ID of the task.|
|bulkDeploymentId|string|false|none|The associated Greengrass bulk deployment ID.|
|bulkDeploymentStatus|string|false|read-only|The associated Greengrass bulk deployment task status.|
|taskStatus|string|false|read-only|The deployment task status.|
|statusMessage|string|false|read-only|Descriptive message regarding the status, such as an error message.|
|deployments|[[DeploymentItem](#schemadeploymentitem)]|false|read-only|Deployments managed via this task.|
|createdAt|string(date-time)|false|read-only|Date/time the group was created.|
|updatedAt|string(date-time)|false|read-only|Date/time the group was updated.|

#### Enumerated Values

|Property|Value|
|---|---|
|bulkDeploymentStatus|Waiting|
|bulkDeploymentStatus|Created|
|bulkDeploymentStatus|Initializing|
|bulkDeploymentStatus|Running|
|bulkDeploymentStatus|Completed|
|bulkDeploymentStatus|Stopping|
|bulkDeploymentStatus|Stopped|
|bulkDeploymentStatus|Failed|
|taskStatus|Waiting|
|taskStatus|InProgress|
|taskStatus|Success|
|taskStatus|Failure|

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

