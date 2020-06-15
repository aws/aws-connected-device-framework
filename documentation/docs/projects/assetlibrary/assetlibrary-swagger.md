---
title: "Connected Device Framework: Asset Library v2.0.0"
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

<h1 id="connected-device-framework-asset-library">Connected Device Framework: Asset Library v2.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

The Asset Library service is a device registry that allows you to manage your fleet of devices within multiple hierarchical groups.  Each one of the branches of the hierarchy can represent something meaningful to your business such as supplier, location, customer, vehicle, etc.

The hierarchies within Asset Library are represented as `Groups`.  Each Group has a single parent, but can comprise of many groups and/or devices as its members.

`Devices` can be associated with one or more `Groups`, each with a named relationship to its group to give context.

`Devices` themselves can be associated with other `Devices`, representing a composition type of relationship.  Examples being a mote that comprises of a number of differnet sensors, or a car engine that is comprised of a number of different components.

Different `Group Templates` can be created to align with your business, with each Group Template having its own attributes.  An example Group Template could be a _Site_, with its _address_ being an example of an attribute.

Likewise, `Device Templates` can be created to represent the different types of devices within your fleet, each with their own attributes.

`Profiles` can be created and applied to device and groups to populate with default attirbutes and/or relations.

`Policies` represent a document that can be attached to one or more groups within a hierarchy, and are automatically inherited by the devices and groups.

<h1 id="connected-device-framework-asset-library-devices">Devices</h1>

A `Device` represents a real world physical device that needs to be registered within the Asset Library, such as a sensor, switch, or a robotic arm.  Each device is the equivalent of a `Thing` within AWS IoT.

Devices can be attached to Groups within a hierarchy.

A Device can represent an assembly of other Devices using the `component` relationship, where the device could optionally be represented as a `Thing` within AWS IoT also. 
Devices are identified by a unique `deviceId`.  Devices comprise of a number of standard attributes, as well as custom attributes.  Refer to the `Device Templates` section for further info.

A Device may have the following state:
- `unprovisioned`:  The metadata for the device has been created, but the device has not yet been provisioned within AWS IoT
- `active`:  The device is active and available for use within AWS IoT
- `decommissioned`:  The device has been decommissioned, therefore is unable to connect to AWS IoT, though may be redeployed and recommissioned elsewhere
- `retired`:  The device has been retired, and has been removed from AWS IoT

## Add a new device to the asset library, adding it to the `/unprovisioned` group if no group is specified.

<a id="opIdcreateDevice"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /devices \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/devices', headers = headers)

print(r.json())

```

`POST /devices`

> Body parameter

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="add-a-new-device-to-the-asset-library,-adding-it-to-the-`/unprovisioned`-group-if-no-group-is-specified.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[Device_1_0](#schemadevice_1_0)|true|Device to add to the asset library|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="add-a-new-device-to-the-asset-library,-adding-it-to-the-`/unprovisioned`-group-if-no-group-is-specified.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Adds a batch of devices in bulk to the asset library, adding them to the `/unprovisioned` group if no groups are specified.

<a id="opIdcreateDeviceBatch"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /bulkdevices \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/bulkdevices', headers = headers)

print(r.json())

```

`POST /bulkdevices`

> Body parameter

```json
{
  "devices": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ]
}
```

<h3 id="adds-a-batch-of-devices-in-bulk-to-the-asset-library,-adding-them-to-the-`/unprovisioned`-group-if-no-groups-are-specified.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[BulkDevices](#schemabulkdevices)|true|List of devices to add to the asset library|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="adds-a-batch-of-devices-in-bulk-to-the-asset-library,-adding-them-to-the-`/unprovisioned`-group-if-no-groups-are-specified.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Update a batch of existing devices

<a id="opIdupdateDeviceBatch"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /bulkdevices \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/bulkdevices', headers = headers)

print(r.json())

```

`PATCH /bulkdevices`

> Body parameter

```json
{
  "devices": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ]
}
```

<h3 id="update-a-batch-of-existing-devices-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[BulkDevices](#schemabulkdevices)|true|List of devices and their attributes to update|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-a-batch-of-existing-devices-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Find device by ID

<a id="opIdgetDeviceByID"></a>

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

Returns a single device

<h3 id="find-device-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|expandComponents|query|boolean|false|By default, components of a device are not returned. Passing `true` will return and expand a devices components.|
|attributes|query|array[string]|false|Optionally only return these specific attributes.  By default returns all attributes.|
|includeGroups|query|array[string]|false|Optionally only return these specific related groups.  By default returns all related groups.|
|expandRelatedDevices|query|boolean|false|By default, only related device id's are returned.  Passing `true` will return expanded related devices instead of just its device id.|
|expandRelatedGroups|query|boolean|false|By default, only related group paths are returned.  Passing `true` will return expanded related groups instead of just its path.|
|filterRelations|query|array[string]|false|Return related devices/groups filtered by relation.  Specify the relation in the format of `{direction}:{relation}`, where `{direction}` may be `in`, `out` or `both`.|
|deviceId|path|string|true|ID of device to return|

> Example responses

> 200 Response

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="find-device-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[Device_2_0](#schemadevice_2_0)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete device of specified ID

<a id="opIddeleteDevice"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}`

Deletes a single device

<h3 id="delete-device-of-specified-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|ID of device to return|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-device-of-specified-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing device attributes

<a id="opIdupdateDevice"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /devices/{deviceId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/devices/{deviceId}', headers = headers)

print(r.json())

```

`PATCH /devices/{deviceId}`

> Body parameter

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="update-an-existing-device-attributes-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[Device_1_0](#schemadevice_1_0)|true|Device object that needs to be updated in device store|
|deviceId|path|string|true|ID of device to return|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-device-attributes-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Associates a device to a group, giving context to its relationship.

<a id="opIdattachToGroupWithDirection"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /devices/{deviceId}/{relationship}/{direction}/groups/{groupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/devices/{deviceId}/{relationship}/{direction}/groups/{groupPath}', headers = headers)

print(r.json())

```

`PUT /devices/{deviceId}/{relationship}/{direction}/groups/{groupPath}`

<h3 id="associates-a-device-to-a-group,-giving-context-to-its-relationship.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of device to attach to the group|
|relationship|path|string|true|The outgoing relationship between the device and group. For example, this may reflect `locatedAt` or `manufacturedAt` relations.|
|direction|path|string|true|The direction of the relationship `in` or `out`|
|groupPath|path|string|true|Path of group.|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="associates-a-device-to-a-group,-giving-context-to-its-relationship.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Removes a device from an associated group

<a id="opIddetachFromGroupWithDirection"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId}/{relationship}/{direction}/groups/{groupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}/{relationship}/{direction}/groups/{groupPath}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}/{relationship}/{direction}/groups/{groupPath}`

<h3 id="removes-a-device-from-an-associated-group-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of device to attach to the group|
|relationship|path|string|true|The outgoing relationship between the device and group. For example, this may reflect `locatedAt` or `manufacturedAt` relations.|
|direction|path|string|true|The direction of the relationship `in` or `out`|
|groupPath|path|string|true|Path of group.|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="removes-a-device-from-an-associated-group-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List a devices related devices.

<a id="opIdlistDeviceRelatedDevices"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId}/{relationship}/devices \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}/{relationship}/devices', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}/{relationship}/devices`

<h3 id="list-a-devices-related-devices.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific device template|
|direction|query|array[string]|false|Direction of relation|
|state|query|array[string]|false|Return devices of a specific state|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|deviceId|path|string|true|Id of device|
|relationship|path|string|true|The relationship between the device and the other device as defined in the device template.|

#### Enumerated Values

|Parameter|Value|
|---|---|
|direction|in|
|direction|out|
|direction|both|
|state|unprovisioned|
|state|active|
|state|decommissioned|
|state|retired|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-a-devices-related-devices.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[DeviceList](#schemadevicelist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Associates a device to another device, giving context to its relationship.

<a id="opIdattachToDeviceWithDirection"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId}', headers = headers)

print(r.json())

```

`PUT /devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId}`

<h3 id="associates-a-device-to-another-device,-giving-context-to-its-relationship.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of source device|
|relationship|path|string|true|The relationship between the device and the other device as defined in the device template.|
|direction|path|string|true|Direction of the relationship - `in` or `out`.|
|otherDeviceId|path|string|true|ID of device to create relationship to.|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="associates-a-device-to-another-device,-giving-context-to-its-relationship.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Removes a device from an associated device

<a id="opIddetachFromDeviceWithDirection"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}/{relationship}/{direction}/devices/{otherDeviceId}`

<h3 id="removes-a-device-from-an-associated-device-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of source device|
|relationship|path|string|true|The relationship between the device and the other device as defined in the device template.|
|direction|path|string|true|Direction of the relationship - `in` or `out`.|
|otherDeviceId|path|string|true|ID of device to create relationship to.|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="removes-a-device-from-an-associated-device-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Createa a new component and adds to the device.

<a id="opIdcreateComponent"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /devices/{deviceId}/components \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/devices/{deviceId}/components', headers = headers)

print(r.json())

```

`POST /devices/{deviceId}/components`

> Body parameter

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="createa-a-new-component-and-adds-to-the-device.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Device_1_0](#schemadevice_1_0)|true|Device to add as a component|
|deviceId|path|string|true|Id of parent device|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="createa-a-new-component-and-adds-to-the-device.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Updates the component of a device.

<a id="opIdupdateComponent"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /devices/{deviceId}/components/{componentId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/devices/{deviceId}/components/{componentId}', headers = headers)

print(r.json())

```

`PATCH /devices/{deviceId}/components/{componentId}`

<h3 id="updates-the-component-of-a-device.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of parent device|
|componentId|path|string|true|ID of child component|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="updates-the-component-of-a-device.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes a component of a devoce.

<a id="opIddeleteComponent"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /devices/{deviceId}/components/{componentId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/devices/{deviceId}/components/{componentId}', headers = headers)

print(r.json())

```

`DELETE /devices/{deviceId}/components/{componentId}`

<h3 id="deletes-a-component-of-a-devoce.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|path|string|true|Id of parent device|
|componentId|path|string|true|ID of child component|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-a-component-of-a-devoce.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-asset-library-groups">Groups</h1>

A `Group` can represent both physical and logical groupings of devices and other groups.  Examples of physical groups include locations and suppliers.  Examples of logical groupings include bill of material structures.

Groups can be constructured with a parent/child relationship to other groups, thus building up a hierarchy of groups.  Device can then be associated to any group within the hierarchy.

Groups are identified by a unique `path`.  Groups comprise of a number of standard attributes, as well as custom attributes.  Refer to the `Group Templates` section for further info.

## List a devices related groups.

<a id="opIdlistDeviceRelatedGroups"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /devices/{deviceId}/{relationship}/groups \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/devices/{deviceId}/{relationship}/groups', headers = headers)

print(r.json())

```

`GET /devices/{deviceId}/{relationship}/groups`

<h3 id="list-a-devices-related-groups.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific group template|
|direction|query|array[string]|false|Direction of relation|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|deviceId|path|string|true|Id of device|
|relationship|path|string|true|The relationship between the device and group as defined by the device template.|

#### Enumerated Values

|Parameter|Value|
|---|---|
|direction|in|
|direction|out|
|direction|both|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-a-devices-related-groups.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupList](#schemagrouplist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Adds a new group to the device library as a child of the `parentPath` as specified in the request body.

<a id="opIdcreateGroup"></a>

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

> Body parameter

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="adds-a-new-group-to-the-device-library-as-a-child-of-the-`parentpath`-as-specified-in-the-request-body.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[Group_1_0](#schemagroup_1_0)|true|Group to add to the asset library|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="adds-a-new-group-to-the-device-library-as-a-child-of-the-`parentpath`-as-specified-in-the-request-body.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Adds a batch of new group to the asset library as a child of the `parentPath` as specified in the request body.

<a id="opIdcreateGroupBatch"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /bulkgroups \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/bulkgroups', headers = headers)

print(r.json())

```

`POST /bulkgroups`

> Body parameter

```json
[
  {
    "groups": [
      {
        "category": "group",
        "groupPath": "string",
        "templateId": "string",
        "name": "string",
        "parentPath": "string",
        "description": "string",
        "attributes": {},
        "relation": "string",
        "direction": "in",
        "groups": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        }
      }
    ]
  }
]
```

<h3 id="adds-a-batch-of-new-group-to-the-asset-library-as-a-child-of-the-`parentpath`-as-specified-in-the-request-body.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[BulkGroups](#schemabulkgroups)|true|Group to add to the asset library|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="adds-a-batch-of-new-group-to-the-asset-library-as-a-child-of-the-`parentpath`-as-specified-in-the-request-body.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Find group by Group's path

<a id="opIdgetGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}`

Returns a single group

<h3 id="find-group-by-group's-path-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|groupPath|path|string|true|Path of group to return|

> Example responses

> 200 Response

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="find-group-by-group's-path-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[Group_2_0](#schemagroup_2_0)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete group with supplied path

<a id="opIddeleteGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /groups/{groupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/groups/{groupPath}', headers = headers)

print(r.json())

```

`DELETE /groups/{groupPath}`

Deletes a single group

<h3 id="delete-group-with-supplied-path-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|groupPath|path|string|true|Path of group to return|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-group-with-supplied-path-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing group attributes, including changing its parent group.

<a id="opIdupdateGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /groups/{groupPath} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/groups/{groupPath}', headers = headers)

print(r.json())

```

`PATCH /groups/{groupPath}`

> Body parameter

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}
```

<h3 id="update-an-existing-group-attributes,-including-changing-its-parent-group.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|applyProfile|query|string|false|Optionally apply a profile to the device to update unset attributes with attributes from the profile.|
|body|body|[Group_1_0](#schemagroup_1_0)|true|Group object that needs to be updated|
|groupPath|path|string|true|Path of group to return|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-group-attributes,-including-changing-its-parent-group.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List device members of group for supplied Group name

<a id="opIdlistGroupMembersDevices"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath}/members/devices \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}/members/devices', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}/members/devices`

Returns device members of group

<h3 id="list-device-members-of-group-for-supplied-group-name-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific device template|
|state|query|array[string]|false|Return devices of a specific state|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|groupPath|path|string|true|Path of group to return its device members. A path of '/' can be passed as id to return top level device members|

#### Enumerated Values

|Parameter|Value|
|---|---|
|state|unprovisioned|
|state|active|
|state|decommissioned|
|state|retired|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-device-members-of-group-for-supplied-group-name-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[DeviceList](#schemadevicelist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List group members of group for supplied Group name

<a id="opIdlistGroupMembersGroups"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath}/members/groups \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}/members/groups', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}/members/groups`

Returns group members of group

<h3 id="list-group-members-of-group-for-supplied-group-name-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific group sub-type|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|groupPath|path|string|true|Path of group to return its group members. A path of '/' can be passed as id to return top level group members|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-group-members-of-group-for-supplied-group-name-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupList](#schemagrouplist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List all ancestor groups of a specific group.

<a id="opIdlistGroupMemberships"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath}/memberships \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}/memberships', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}/memberships`

List all ancestor groups of a specific group.

<h3 id="list-all-ancestor-groups-of-a-specific-group.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|groupPath|path|string|true|Path of group for fetching the membership|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-all-ancestor-groups-of-a-specific-group.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupList](#schemagrouplist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List a groups related devices.

<a id="opIdlistGroupRelatedDevices"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath}/{relationship}/devices \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}/{relationship}/devices', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}/{relationship}/devices`

<h3 id="list-a-groups-related-devices.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific device template|
|direction|query|array[string]|false|Direction of relation|
|state|query|array[string]|false|Return devices of a specific state|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|groupPath|path|string|true|Path of source group|
|relationship|path|string|true|The relationship between the group and the devices as defined by the group/device templatea.  Use `%2A` (urlencoded `*`) to return all.|

#### Enumerated Values

|Parameter|Value|
|---|---|
|direction|in|
|direction|out|
|direction|both|
|state|unprovisioned|
|state|active|
|state|decommissioned|
|state|retired|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-a-groups-related-devices.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[DeviceList](#schemadevicelist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## List a groups related groups.

<a id="opIdlistGroupRelatedGroups"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /groups/{groupPath}/{relationship}/groups \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/groups/{groupPath}/{relationship}/groups', headers = headers)

print(r.json())

```

`GET /groups/{groupPath}/{relationship}/groups`

<h3 id="list-a-groups-related-groups.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|template|query|string|false|Optional filter to return a specific group template|
|direction|query|array[string]|false|Direction of relation|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|
|groupPath|path|string|true|Path of source group|
|relationship|path|string|true|The relationship between the groups as defined by the group template.  Use `%2A` (urlencoded `*`) to return all.|

#### Enumerated Values

|Parameter|Value|
|---|---|
|direction|in|
|direction|out|
|direction|both|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}
```

<h3 id="list-a-groups-related-groups.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupList](#schemagrouplist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Associates a group with another group, giving context to its relationship.

<a id="opIdattachGroupToGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}', headers = headers)

print(r.json())

```

`PUT /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}`

<h3 id="associates-a-group-with-another-group,-giving-context-to-its-relationship.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|sourceGroupPath|path|string|true|Path of source group|
|relationship|path|string|true|The relationship between the groups. For example, this may reflect `locatedAt` or `manufacturedAt` relations.|
|targetGroupPath|path|string|true|Path of target group|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="associates-a-group-with-another-group,-giving-context-to-its-relationship.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Removes a group from an associated group

<a id="opIddetachGroupFromGroup"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}', headers = headers)

print(r.json())

```

`DELETE /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}`

<h3 id="removes-a-group-from-an-associated-group-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|sourceGroupPath|path|string|true|Path of source group|
|relationship|path|string|true|The relationship between the groups. For example, this may reflect `locatedAt` or `manufacturedAt` relations.|
|targetGroupPath|path|string|true|Path of target group|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="removes-a-group-from-an-associated-group-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-asset-library-templates">Templates</h1>

Templates represent custom device and group templates that you define, each with their own attributes and constraints.

Devices are identified by a unique `deviceId`, each have the following built-in attributes:
- `templateId`:  a specific device template that represents what custom attributes the device can have
- `name`:  name of the device
- `description`:  description of the device
- `imageUrl`:  URL of an image of the device
- `awsIotThingArn`:  the ARN to lookup devices that have been registered as Things within AWS IoT
- `connected`:  indicates whether the device is currently connected to AWS IoT
- `state`:  the state of the device (unprovisioned, active, decommissioned or retired)
- `groups`:  the paths of the groups that the device has been attached to
- `attributes`:  A key value map of attributes that have been created as part of defining a custom device template.

When a Device is created as a component of another Device, it has all the same built-in attributes as described above with the exception of `groups`.  

Groups are identified by a unique `path`, and each have the following built-on attributes:
- `templateId`:  a specific group template that represents what custom attributes the group can have
- `parentPath`:  the path of the parent group that the group belongs to
- `name`:  name of the group
- `description`:  description of the group
- `attributes`:  A key value map of attributes that have been created as part of defining a custom group template.

When defining the attributes of a custom device/group template, constraints can be applied using JSON Schema notation.  Each of these custom attributes is accessible as `attributes.` within the custom device/group template.

A simple example request body to register a new device template:

    {
        "properties": {
            "length": {"type": "number"},
            "width": {"type": "number"},
            "height": {"type": "number"}
        }
    }

A more complex example request body to register a new device template:

    {
        "properties": {
            "length": {
                "type": "number",
                "minimum": 1,
                "maximum": 5
            },
            "width": {
                "type": "integer",
                "multipleOf": 2
            },
            "fleet": {
                "type": "string",
                "minLength": 5,
                "maxLength": 50
            },
            "firmware": {
                "type": "string",
                "pattern": "[abc]+"
              
            },
            "ipAddress": {
                "type": "string",
                "format": "ipv4"
            },
            "level": {
                "type": "string",
                "enum": ["low", "medium", "high"]
            }
        },
        "required": ["fleet", "firmware", "ipAddress"]
    }

## Registers a new device template within the system, using the JSON Schema standard to define the device template attributes and constraints.

<a id="opIdcreateDeviceTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /templates/devices/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/templates/devices/{templateId}', headers = headers)

print(r.json())

```

`POST /templates/devices/{templateId}`

> Body parameter

```json
{
  "properties": {
    "property1": "string",
    "property2": "string"
  },
  "required": [
    "string"
  ],
  "relations": {
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}
```

<h3 id="registers-a-new-device-template-within-the-system,-using-the-json-schema-standard-to-define-the-device-template-attributes-and-constraints.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[TemplateDefinition](#schematemplatedefinition)|true|none|
|templateId|path|string|true|ID of device template to publish|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="registers-a-new-device-template-within-the-system,-using-the-json-schema-standard-to-define-the-device-template-attributes-and-constraints.
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Find device template by ID

<a id="opIdgetDeviceTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /templates/devices/{templateId}?status=draft \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/templates/devices/{templateId}', params={
  'status': 'draft'
}, headers = headers)

print(r.json())

```

`GET /templates/devices/{templateId}`

Returns a single device template definition

<h3 id="find-device-template-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|status|query|string|true|Status of device template to return|
|templateId|path|string|true|ID of device template to publish|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|draft|
|status|published|

> Example responses

> 200 Response

```json
{
  "templateId": "string",
  "category": "device",
  "schema": {
    "version": 0,
    "definition": {
      "properties": {
        "property1": "string",
        "property2": "string"
      },
      "required": [
        "string"
      ],
      "relations": {
        "out": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        },
        "in": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        }
      }
    },
    "status": "draft"
  }
}
```

<h3 id="find-device-template-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[TemplateInfo](#schematemplateinfo)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing device template.

<a id="opIdupdateDeviceTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /templates/devices/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/templates/devices/{templateId}', headers = headers)

print(r.json())

```

`PATCH /templates/devices/{templateId}`

> Body parameter

```json
{
  "properties": {
    "property1": "string",
    "property2": "string"
  },
  "required": [
    "string"
  ],
  "relations": {
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}
```

<h3 id="update-an-existing-device-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[TemplateDefinition](#schematemplatedefinition)|true|none|
|templateId|path|string|true|ID of device template to publish|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-device-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes an existing device template.

<a id="opIddeleteDeviceTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /templates/devices/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/templates/devices/{templateId}', headers = headers)

print(r.json())

```

`DELETE /templates/devices/{templateId}`

<h3 id="deletes-an-existing-device-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of device template to publish|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-an-existing-device-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Publishes an existing device template.

<a id="opIdpublishDeviceTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /templates/devices/{templateId}/publish \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/templates/devices/{templateId}/publish', headers = headers)

print(r.json())

```

`PUT /templates/devices/{templateId}/publish`

<h3 id="publishes-an-existing-device-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of device template to publish|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="publishes-an-existing-device-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Registers a new group template within the system, using the JSON Schema standard to define the group template attributes and constraints.

<a id="opIdcreateGroupTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /templates/groups/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/templates/groups/{templateId}', headers = headers)

print(r.json())

```

`POST /templates/groups/{templateId}`

> Body parameter

```json
{
  "properties": {
    "property1": "string",
    "property2": "string"
  },
  "required": [
    "string"
  ],
  "relations": {
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}
```

<h3 id="registers-a-new-group-template-within-the-system,-using-the-json-schema-standard-to-define-the-group-template-attributes-and-constraints.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[TemplateDefinition](#schematemplatedefinition)|true|none|
|templateId|path|string|true|ID of group template to return|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="registers-a-new-group-template-within-the-system,-using-the-json-schema-standard-to-define-the-group-template-attributes-and-constraints.
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Find group template by ID

<a id="opIdgetGroupTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /templates/groups/{templateId}?status=draft \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/templates/groups/{templateId}', params={
  'status': 'draft'
}, headers = headers)

print(r.json())

```

`GET /templates/groups/{templateId}`

Returns a single group template definition

<h3 id="find-group-template-by-id-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|status|query|string|true|Status of group template to return|
|templateId|path|string|true|ID of group template to return|

#### Enumerated Values

|Parameter|Value|
|---|---|
|status|draft|
|status|published|

> Example responses

> 200 Response

```json
{
  "templateId": "string",
  "category": "device",
  "schema": {
    "version": 0,
    "definition": {
      "properties": {
        "property1": "string",
        "property2": "string"
      },
      "required": [
        "string"
      ],
      "relations": {
        "out": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        },
        "in": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        }
      }
    },
    "status": "draft"
  }
}
```

<h3 id="find-group-template-by-id-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[TemplateInfo](#schematemplateinfo)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing group template.

<a id="opIdupdateGroupTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /templates/groups/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/templates/groups/{templateId}', headers = headers)

print(r.json())

```

`PATCH /templates/groups/{templateId}`

> Body parameter

```json
{
  "properties": {
    "property1": "string",
    "property2": "string"
  },
  "required": [
    "string"
  ],
  "relations": {
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}
```

<h3 id="update-an-existing-group-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[TemplateDefinition](#schematemplatedefinition)|true|none|
|templateId|path|string|true|ID of group template to return|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-group-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deletes an existing group template.

<a id="opIddeleteGroupTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /templates/groups/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/templates/groups/{templateId}', headers = headers)

print(r.json())

```

`DELETE /templates/groups/{templateId}`

<h3 id="deletes-an-existing-group-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of group template to return|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="deletes-an-existing-group-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Publishes an existing group template.

<a id="opIdpublishGroupTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /templates/groups/{templateId}/publish \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/templates/groups/{templateId}/publish', headers = headers)

print(r.json())

```

`PUT /templates/groups/{templateId}/publish`

<h3 id="publishes-an-existing-group-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of group template to publish|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="publishes-an-existing-group-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-asset-library-profiles">Profiles</h1>

A profile represents a set of default attributes and/or relations that can be applied to a device/group for a particular template.  Multiple profiles can be created per template.

## Adds a new device profile for a specific template.

<a id="opIdcreateDeviceProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /profiles/device/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/profiles/device/{templateId}', headers = headers)

print(r.json())

```

`POST /profiles/device/{templateId}`

> Body parameter

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="adds-a-new-device-profile-for-a-specific-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[DeviceProfile_1_0](#schemadeviceprofile_1_0)|true|Device Profile to add to the asset library|
|templateId|path|string|true|ID of the device template|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="adds-a-new-device-profile-for-a-specific-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Return all device profiles for a specific template

<a id="opIdlistDeviceProfiles"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /profiles/device/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/profiles/device/{templateId}', headers = headers)

print(r.json())

```

`GET /profiles/device/{templateId}`

ReturnsReturn all device profiles for a specific template

<h3 id="return-all-device-profiles-for-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the device template|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "profileId": "string"
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  }
}
```

<h3 id="return-all-device-profiles-for-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[DeviceProfileList](#schemadeviceprofilelist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve a device profile

<a id="opIdgetDeviceProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /profiles/device/{templateId}/{profileId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/profiles/device/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`GET /profiles/device/{templateId}/{profileId}`

Returns a single device profile

<h3 id="retrieve-a-device-profile-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the device template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 200 Response

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="retrieve-a-device-profile-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[DeviceProfile_2_0](#schemadeviceprofile_2_0)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete a specific device profile

<a id="opIddeleteDeviceProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /profiles/device/{templateId}/{profileId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/profiles/device/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`DELETE /profiles/device/{templateId}/{profileId}`

Delete a specific device profile

<h3 id="delete-a-specific-device-profile-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the device template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-a-specific-device-profile-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing device profile.

<a id="opIdupdateDeviceProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /profiles/device/{templateId}/{profileId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/profiles/device/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`PATCH /profiles/device/{templateId}/{profileId}`

> Body parameter

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="update-an-existing-device-profile.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[DeviceProfile_1_0](#schemadeviceprofile_1_0)|true|Profile that needs to be updated|
|templateId|path|string|true|ID of the device template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-device-profile.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Adds a new group profile for a specific template.

<a id="opIdcreateGroupProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /profiles/group/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/profiles/group/{templateId}', headers = headers)

print(r.json())

```

`POST /profiles/group/{templateId}`

> Body parameter

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="adds-a-new-group-profile-for-a-specific-template.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[GroupProfile_1_0](#schemagroupprofile_1_0)|true|Group Profile to add to the asset library|
|templateId|path|string|true|ID of the group template|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="adds-a-new-group-profile-for-a-specific-template.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Return all group profiles for a specific template

<a id="opIdlistGroupProfiles"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /profiles/group/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/profiles/group/{templateId}', headers = headers)

print(r.json())

```

`GET /profiles/group/{templateId}`

Return all group profiles for a specific template

<h3 id="return-all-group-profiles-for-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the group template|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "profileId": "string"
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  }
}
```

<h3 id="return-all-group-profiles-for-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupProfileList](#schemagroupprofilelist)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve a group profile

<a id="opIdgetGroupProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /profiles/group/{templateId}/{profileId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/profiles/group/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`GET /profiles/group/{templateId}/{profileId}`

Returns a single group profile

<h3 id="retrieve-a-group-profile-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the group template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 200 Response

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="retrieve-a-group-profile-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|[GroupProfile_2_0](#schemagroupprofile_2_0)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete a specific group profile

<a id="opIddeleteGroupProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /profiles/group/{templateId}/{profileId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/profiles/group/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`DELETE /profiles/group/{templateId}/{profileId}`

Delete a specific group profile

<h3 id="delete-a-specific-group-profile-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of the group template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 404 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-a-specific-group-profile-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Update an existing group profile.

<a id="opIdupdateGroupProfile"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /profiles/group/{templateId}/{profileId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/profiles/group/{templateId}/{profileId}', headers = headers)

print(r.json())

```

`PATCH /profiles/group/{templateId}/{profileId}`

> Body parameter

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}
```

<h3 id="update-an-existing-group-profile.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[GroupProfile_1_0](#schemagroupprofile_1_0)|true|Profile that needs to be updated|
|templateId|path|string|true|ID of the group template|
|profileId|path|string|true|ID of the profile|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-an-existing-group-profile.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-asset-library-policies">Policies</h1>

A policy represents a document that can be attached to one or more hierarchies, and then be inherited by any groups or devices that belong to all the hierarchies that the policy is applied to.

A good use for policies is to look up appropriate documents or authorization levels based on a device or groups associations to specific hierarchies.  As an example, let's say you need to apply different AWS IoT security policies when registering devices as Things depending upon their location.  This would be handled by assigning a policy representing a provisoning template to different groups within a hierarchy representing the location.  The appropriate provisioning template will be returned for the device/group depending on which and where in a hierarchy they are attached to.  

## Creates a new `Policy`, and applies it to the provided `Groups`.

<a id="opIdcreatePolicy"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /policies \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/policies', headers = headers)

print(r.json())

```

`POST /policies`

> Body parameter

```json
{
  "policyId": "string",
  "type": "string",
  "description": "string",
  "appliesTo": [
    "string"
  ],
  "document": "string"
}
```

<h3 id="creates-a-new-`policy`,-and-applies-it-to-the-provided-`groups`.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Policy](#schemapolicy)|true|Policy to create.|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="creates-a-new-`policy`,-and-applies-it-to-the-provided-`groups`.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## List policies, optionally filtered by policy type.

<a id="opIdlistPolicies"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /policies?type=string \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/policies', params={
  'type': 'string'
}, headers = headers)

print(r.json())

```

`GET /policies`

<h3 id="list-policies,-optionally-filtered-by-policy-type.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|type|query|string|true|Policy type to refilterturn|

> Example responses

> 200 Response

```json
[
  {
    "policies": [
      {
        "policyId": "string",
        "type": "string",
        "description": "string",
        "appliesTo": [
          "string"
        ],
        "document": "string"
      }
    ],
    "pagination": {
      "offset": 0,
      "count": 0
    }
  }
]
```

<h3 id="list-policies,-optionally-filtered-by-policy-type.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<h3 id="list-policies,-optionally-filtered-by-policy-type.-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[[PolicyList](#schemapolicylist)]|false|none|none|
|» policies|[[Policy](#schemapolicy)]|false|none|a list of policies|
|»» policyId|string|false|none|unique ID of policy|
|»» type|string|false|none|type of policy|
|»» description|string|false|none|description of policy|
|»» appliesTo|[string]|false|none|the paths of the group that this policy applies to|
|»» document|string|false|none|the policy document (e.g. a provisioning template)|
|» pagination|object|false|none|none|
|»» offset|integer|false|none|none|
|»» count|integer|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

## Returns all inherited `Policies` for a `Device` or set of `Groups` where the `Device`/`Groups` are associated with all the hierarchies that the `Policy` applies to.  Either `deviceId` or `groupPath` must be provided.

<a id="opIdlistInheritedPolicies"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /policies/inherited?type=string \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/policies/inherited', params={
  'type': 'string'
}, headers = headers)

print(r.json())

```

`GET /policies/inherited`

<h3 id="returns-all-inherited-`policies`-for-a-`device`-or-set-of-`groups`-where-the-`device`/`groups`-are-associated-with-all-the-hierarchies-that-the-`policy`-applies-to.--either-`deviceid`-or-`grouppath`-must-be-provided.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|deviceId|query|string|false|ID of device to list policies|
|groupPath|query|array[string]|false|Path of groups to list policies|
|type|query|string|true|Policy type to return|

> Example responses

> 200 Response

```json
[
  {
    "policies": [
      {
        "policyId": "string",
        "type": "string",
        "description": "string",
        "appliesTo": [
          "string"
        ],
        "document": "string"
      }
    ],
    "pagination": {
      "offset": 0,
      "count": 0
    }
  }
]
```

<h3 id="returns-all-inherited-`policies`-for-a-`device`-or-set-of-`groups`-where-the-`device`/`groups`-are-associated-with-all-the-hierarchies-that-the-`policy`-applies-to.--either-`deviceid`-or-`grouppath`-must-be-provided.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<h3 id="returns-all-inherited-`policies`-for-a-`device`-or-set-of-`groups`-where-the-`device`/`groups`-are-associated-with-all-the-hierarchies-that-the-`policy`-applies-to.--either-`deviceid`-or-`grouppath`-must-be-provided.-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[[PolicyList](#schemapolicylist)]|false|none|none|
|» policies|[[Policy](#schemapolicy)]|false|none|a list of policies|
|»» policyId|string|false|none|unique ID of policy|
|»» type|string|false|none|type of policy|
|»» description|string|false|none|description of policy|
|»» appliesTo|[string]|false|none|the paths of the group that this policy applies to|
|»» document|string|false|none|the policy document (e.g. a provisioning template)|
|» pagination|object|false|none|none|
|»» offset|integer|false|none|none|
|»» count|integer|false|none|none|

<aside class="success">
This operation does not require authentication
</aside>

## Update the attributes of an existing policy.

<a id="opIdupdatePolicy"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /policies/{policyId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/policies/{policyId}', headers = headers)

print(r.json())

```

`PATCH /policies/{policyId}`

> Body parameter

```json
{
  "policyId": "string",
  "type": "string",
  "description": "string",
  "appliesTo": [
    "string"
  ],
  "document": "string"
}
```

<h3 id="update-the-attributes-of-an-existing-policy.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Policy](#schemapolicy)|true|Policy that needs to be updated|
|policyId|path|string|true|ID of policy|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="update-the-attributes-of-an-existing-policy.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Delete an existing policy.

<a id="opIddeletePolicy"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /policies/{policyId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/policies/{policyId}', headers = headers)

print(r.json())

```

`DELETE /policies/{policyId}`

<h3 id="delete-an-existing-policy.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|policyId|path|string|true|ID of policy|

> Example responses

> 400 Response

```json
{
  "message": "string"
}
```

<h3 id="delete-an-existing-policy.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|successful operation|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Retrieve a specific policy.

<a id="opIdgetPolicy"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /policies/{policyId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/policies/{policyId}', headers = headers)

print(r.json())

```

`GET /policies/{policyId}`

<h3 id="retrieve-a-specific-policy.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|policyId|path|string|true|ID of policy|

> Example responses

> 200 Response

```json
[
  {
    "policyId": "string",
    "type": "string",
    "description": "string",
    "appliesTo": [
      "string"
    ],
    "document": "string"
  }
]
```

<h3 id="retrieve-a-specific-policy.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<h3 id="retrieve-a-specific-policy.-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[[Policy](#schemapolicy)]|false|none|none|
|» policyId|string|false|none|unique ID of policy|
|» type|string|false|none|type of policy|
|» description|string|false|none|description of policy|
|» appliesTo|[string]|false|none|the paths of the group that this policy applies to|
|» document|string|false|none|the policy document (e.g. a provisioning template)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-asset-library-search">Search</h1>

The search api allows you to search across both devices and groups applying a variety of different filters.

Filters are applied via query parameters.  To apply filters uisng an attribute from the item being returned specify in the format of `?filter=field:value`.  To filter based on an attribute of a linked item, specify in the format of `?filter=relation:direction:field:value`.  Multiple `relation:direction`'s may be specified to define paths between multiple linked items using the format `?filter=relation_1:direction_1:relation...:direction...:field:value`.

URL Parameter | Description
---|---
`?eq=deviceId:MOD123` | 'deviceId' equals 'MOD123'
`?lte=cycles:5` | 'cycles' less than or equals to 5
`?gt=located_at:out:qty:10` | 'qty' of the item linked via the outgoing 'located_at' relation is greater than 10

Multiple queries of the same type may be specified, for example if two equal filters are required:

    ?eq=deviceId:MOD123&eq=state:active

## Search for groups and devices.

<a id="opIdsearch"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /search \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/search', headers = headers)

print(r.json())

```

`GET /search`

<h3 id="search-for-groups-and-devices.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|type|query|array[string]|false|Type of group/device to filter.  This can be the high level `group` or `device`, as well as any custom group or device template that may have been registered.|
|ancestorPath|query|string|false|The path of a common ancestor group to filter results by.|
|eq|query|array[string]|false|Filter an attribute based on an exact match. E.g. `?eq=firmwareVersion:ABC123`|
|neq|query|array[string]|false|Filter by an attribute based on not matching. E.g. `?neq=firmwareVersion:ABC123`|
|lt|query|array[number]|false|Filter an attribute based on having a value less than. E.g. `?lt=deploymentId:3`|
|lte|query|array[number]|false|Filter an attribute based on having a value less than or equal to. E.g. `?lte=deploymentId:3`|
|gt|query|array[number]|false|Filter an attribute based on having a value greater than. E.g. `?gt=deploymentId:3`|
|gte|query|array[number]|false|Filter an attribute based on having a value greater than or equal to. E.g. `?gte=deploymentId:3`|
|startsWith|query|array[string]|false|Filter by an attribute based on starting with specific text. E.g. `?startsWith=model:MOD123`|
|endsWith|query|array[string]|false|NOT IMPLEMENTED!`|
|contains|query|array[string]|false|NOT IMPLEMENTED!|
|exist|query|array[string]|false|Return a match if the device/group in context has a matching relation/atrribute. E.g. `?exists=installed_in:out:groupPath:/vehicle/001`|
|nexist|query|array[string]|false|Return a match if the device/group in context does not have a matching relation/atrribute. E.g. `?nxists=installed_in:out:groupPath:/vehicle/001`|
|facetField|query|string|false|Perform a faceted query.  Specify in the format of `?facetField=relation:direction:field`|
|summarize|query|boolean|false|Summarize the search results by providing a total, instead of returning the results themselves.|
|offset|query|integer|false|The index to start paginated results from|
|count|query|integer|false|The maximum number of results to return|

> Example responses

> 200 Response

```json
[
  {
    "results": [
      {
        "category": "group",
        "deviceId": "string",
        "templateId": "string",
        "description": "string",
        "awsIotThingArn": "string",
        "imageUrl": "string",
        "connected": true,
        "state": "unprovisioned",
        "assemblyOf": null,
        "components": [
          null
        ],
        "attributes": {},
        "relation": "string",
        "direction": "in",
        "groups": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        },
        "devices": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        }
      }
    ]
  }
]
```

<h3 id="search-for-groups-and-devices.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|successful operation|Inline|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<h3 id="search-for-groups-and-devices.-responseschema">Response Schema</h3>

Status Code **200**

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[[SearchResults](#schemasearchresults)]|false|none|none|
|» results|[oneOf]|false|none|none|

*oneOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|any|false|none|none|

*anyOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|any|false|none|none|

*allOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|

*allOf - discriminator: category*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»»» *anonymous*|[Entity](#schemaentity)|false|none|none|
|»»»»»» category|string|false|none|Category of entity.|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»»» *anonymous*|object|false|none|none|
|»»»»»» deviceId|string|false|none|Globally unique id of the Device.|
|»»»»»» templateId|string|false|none|Template of Device.|
|»»»»»» description|string|false|none|Description of the group.|
|»»»»»» awsIotThingArn|string|false|none|Arn of the device if registered within the AWS IoT registry.|
|»»»»»» imageUrl|string|false|none|URL of an image of the device.|
|»»»»»» connected|boolean|false|none|AWS IoT connectivity status|
|»»»»»» state|string|false|none|The current state of the device|
|»»»»»» assemblyOf|object|false|none|none|
|»»»»»» components|[allOf]|false|none|The device components that this Device is assembled of.|
|»»»»»» attributes|object|false|none|none|
|»»»»»» relation|string|false|none|Name of relation to this device (readonly, populated when displaying related devices only)|
|»»»»»» direction|string|false|none|Direction of relation  (readonly, populated when displaying related devices only)|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|
|»»»»» groups|object|false|none|Paths of the groups that this Device is associated with.|
|»»»»»» **additionalProperties**|[string]|false|none|none|
|»»»»» devices|object|false|none|Ids of the devices that this Device is associated with.|
|»»»»»» **additionalProperties**|[string]|false|none|none|

*or*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|any|false|none|none|

*allOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|

*allOf - discriminator: category*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»»» *anonymous*|[Entity](#schemaentity)|false|none|none|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»»» *anonymous*|object|false|none|none|
|»»»»»» groupPath|string|false|none|Path of the group.|
|»»»»»» templateId|string|false|none|Template of group.  Use 'Group' if no custom attributes are required.|
|»»»»»» name|string|false|none|name of group.|
|»»»»»» parentPath|string|false|none|Path of the groups parent.|
|»»»»»» description|string|false|none|Description of the group.|
|»»»»»» attributes|object|false|none|none|
|»»»»»» relation|string|false|none|Name of relation to this group (readonly, populated when displaying related groups only)|
|»»»»»» direction|string|false|none|Direction of relation  (readonly, populated when displaying related groups only)|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|
|»»»»» groups|object|false|none|Paths of the groups that this Group is associated with.|
|»»»»»» **additionalProperties**|[string]|false|none|none|

*xor*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|any|false|none|none|

*anyOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|any|false|none|none|

*allOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|
|»»»»» groups|object|false|none|none|
|»»»»»» in|object|false|none|Paths of the incoming groups that this Device is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|
|»»»»»» out|object|false|none|Paths of the outgoing groups that this Device is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|
|»»»»» devices|object|false|none|none|
|»»»»»» in|object|false|none|Ids of the incoming devices that this Device is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|
|»»»»»» out|object|false|none|Ids of the outgoing devices that this Device is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|

*or*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»» *anonymous*|any|false|none|none|

*allOf*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|

*and*

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»»»» *anonymous*|object|false|none|none|
|»»»»» groups|object|false|none|none|
|»»»»»» in|object|false|none|Paths of the incoming groups that this Group is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|
|»»»»»» out|object|false|none|Paths of the outgoing groups that this Group is associated with.|
|»»»»»»» **additionalProperties**|[string]|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|category|group|
|category|device|
|state|unprovisioned|
|state|active|
|state|decommissioned|
|state|retired|
|direction|in|
|direction|out|
|direction|in|
|direction|out|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_Entity">Entity</h2>
<!-- backwards compatibility -->
<a id="schemaentity"></a>
<a id="schema_Entity"></a>
<a id="tocSentity"></a>
<a id="tocsentity"></a>

```json
{
  "category": "group"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|category|string|false|none|Category of entity.|

#### Enumerated Values

|Property|Value|
|---|---|
|category|group|
|category|device|

<h2 id="tocS_Device">Device</h2>
<!-- backwards compatibility -->
<a id="schemadevice"></a>
<a id="schema_Device"></a>
<a id="tocSdevice"></a>
<a id="tocsdevice"></a>

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in"
}

```

### Properties

allOf - discriminator: Entity.category

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Entity](#schemaentity)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» deviceId|string|false|none|Globally unique id of the Device.|
|» templateId|string|false|none|Template of Device.|
|» description|string|false|none|Description of the group.|
|» awsIotThingArn|string|false|none|Arn of the device if registered within the AWS IoT registry.|
|» imageUrl|string|false|none|URL of an image of the device.|
|» connected|boolean|false|none|AWS IoT connectivity status|
|» state|string|false|none|The current state of the device|
|» assemblyOf|[Device](#schemadevice)|false|none|none|
|» components|[[Device](#schemadevice)]|false|none|The device components that this Device is assembled of.|
|» attributes|object|false|none|none|
|» relation|string|false|none|Name of relation to this device (readonly, populated when displaying related devices only)|
|» direction|string|false|none|Direction of relation  (readonly, populated when displaying related devices only)|

#### Enumerated Values

|Property|Value|
|---|---|
|state|unprovisioned|
|state|active|
|state|decommissioned|
|state|retired|
|direction|in|
|direction|out|

<h2 id="tocS_Device_1_0">Device_1_0</h2>
<!-- backwards compatibility -->
<a id="schemadevice_1_0"></a>
<a id="schema_Device_1_0"></a>
<a id="tocSdevice_1_0"></a>
<a id="tocsdevice_1_0"></a>

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Device](#schemadevice)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» groups|object|false|none|Paths of the groups that this Device is associated with.|
|»» **additionalProperties**|[string]|false|none|none|
|» devices|object|false|none|Ids of the devices that this Device is associated with.|
|»» **additionalProperties**|[string]|false|none|none|

<h2 id="tocS_Device_2_0">Device_2_0</h2>
<!-- backwards compatibility -->
<a id="schemadevice_2_0"></a>
<a id="schema_Device_2_0"></a>
<a id="tocSdevice_2_0"></a>
<a id="tocsdevice_2_0"></a>

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  },
  "devices": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Device](#schemadevice)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» groups|object|false|none|none|
|»» in|object|false|none|Paths of the incoming groups that this Device is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|
|»» out|object|false|none|Paths of the outgoing groups that this Device is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|
|» devices|object|false|none|none|
|»» in|object|false|none|Ids of the incoming devices that this Device is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|
|»» out|object|false|none|Ids of the outgoing devices that this Device is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|

<h2 id="tocS_DeviceProfile_1_0">DeviceProfile_1_0</h2>
<!-- backwards compatibility -->
<a id="schemadeviceprofile_1_0"></a>
<a id="schema_DeviceProfile_1_0"></a>
<a id="tocSdeviceprofile_1_0"></a>
<a id="tocsdeviceprofile_1_0"></a>

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "devices": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Device_1_0](#schemadevice_1_0)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» profileId|string|false|none|ID of the profile.|

<h2 id="tocS_DeviceProfile_2_0">DeviceProfile_2_0</h2>
<!-- backwards compatibility -->
<a id="schemadeviceprofile_2_0"></a>
<a id="schema_DeviceProfile_2_0"></a>
<a id="tocSdeviceprofile_2_0"></a>
<a id="tocsdeviceprofile_2_0"></a>

```json
{
  "category": "group",
  "deviceId": "string",
  "templateId": "string",
  "description": "string",
  "awsIotThingArn": "string",
  "imageUrl": "string",
  "connected": true,
  "state": "unprovisioned",
  "assemblyOf": null,
  "components": [
    null
  ],
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  },
  "devices": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  },
  "profileId": "string"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Device_2_0](#schemadevice_2_0)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» profileId|string|false|none|ID of the profile.|

<h2 id="tocS_Group">Group</h2>
<!-- backwards compatibility -->
<a id="schemagroup"></a>
<a id="schema_Group"></a>
<a id="tocSgroup"></a>
<a id="tocsgroup"></a>

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in"
}

```

### Properties

allOf - discriminator: Entity.category

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Entity](#schemaentity)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» groupPath|string|false|none|Path of the group.|
|» templateId|string|false|none|Template of group.  Use 'Group' if no custom attributes are required.|
|» name|string|false|none|name of group.|
|» parentPath|string|false|none|Path of the groups parent.|
|» description|string|false|none|Description of the group.|
|» attributes|object|false|none|none|
|» relation|string|false|none|Name of relation to this group (readonly, populated when displaying related groups only)|
|» direction|string|false|none|Direction of relation  (readonly, populated when displaying related groups only)|

#### Enumerated Values

|Property|Value|
|---|---|
|direction|in|
|direction|out|

<h2 id="tocS_Group_1_0">Group_1_0</h2>
<!-- backwards compatibility -->
<a id="schemagroup_1_0"></a>
<a id="schema_Group_1_0"></a>
<a id="tocSgroup_1_0"></a>
<a id="tocsgroup_1_0"></a>

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  }
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Group](#schemagroup)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» groups|object|false|none|Paths of the groups that this Group is associated with.|
|»» **additionalProperties**|[string]|false|none|none|

<h2 id="tocS_Group_2_0">Group_2_0</h2>
<!-- backwards compatibility -->
<a id="schemagroup_2_0"></a>
<a id="schema_Group_2_0"></a>
<a id="tocSgroup_2_0"></a>
<a id="tocsgroup_2_0"></a>

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Group](#schemagroup)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» groups|object|false|none|none|
|»» in|object|false|none|Paths of the incoming groups that this Group is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|
|»» out|object|false|none|Paths of the outgoing groups that this Group is associated with.|
|»»» **additionalProperties**|[string]|false|none|none|

<h2 id="tocS_GroupProfile_1_0">GroupProfile_1_0</h2>
<!-- backwards compatibility -->
<a id="schemagroupprofile_1_0"></a>
<a id="schema_GroupProfile_1_0"></a>
<a id="tocSgroupprofile_1_0"></a>
<a id="tocsgroupprofile_1_0"></a>

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "property1": [
      "string"
    ],
    "property2": [
      "string"
    ]
  },
  "profileId": "string"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Group_1_0](#schemagroup_1_0)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» profileId|string|false|none|ID of the profile.|

<h2 id="tocS_GroupProfile_2_0">GroupProfile_2_0</h2>
<!-- backwards compatibility -->
<a id="schemagroupprofile_2_0"></a>
<a id="schema_GroupProfile_2_0"></a>
<a id="tocSgroupprofile_2_0"></a>
<a id="tocsgroupprofile_2_0"></a>

```json
{
  "category": "group",
  "groupPath": "string",
  "templateId": "string",
  "name": "string",
  "parentPath": "string",
  "description": "string",
  "attributes": {},
  "relation": "string",
  "direction": "in",
  "groups": {
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  },
  "profileId": "string"
}

```

### Properties

allOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|[Group_2_0](#schemagroup_2_0)|false|none|none|

and

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|*anonymous*|object|false|none|none|
|» profileId|string|false|none|ID of the profile.|

<h2 id="tocS_BulkDevices">BulkDevices</h2>
<!-- backwards compatibility -->
<a id="schemabulkdevices"></a>
<a id="schema_BulkDevices"></a>
<a id="tocSbulkdevices"></a>
<a id="tocsbulkdevices"></a>

```json
{
  "devices": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|devices|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Device_1_0](#schemadevice_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Device_2_0](#schemadevice_2_0)|false|none|none|

<h2 id="tocS_BulkGroups">BulkGroups</h2>
<!-- backwards compatibility -->
<a id="schemabulkgroups"></a>
<a id="schema_BulkGroups"></a>
<a id="tocSbulkgroups"></a>
<a id="tocsbulkgroups"></a>

```json
{
  "groups": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|groups|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Group_1_0](#schemagroup_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Group_2_0](#schemagroup_2_0)|false|none|none|

<h2 id="tocS_GroupList">GroupList</h2>
<!-- backwards compatibility -->
<a id="schemagrouplist"></a>
<a id="schema_GroupList"></a>
<a id="tocSgrouplist"></a>
<a id="tocsgrouplist"></a>

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Group_1_0](#schemagroup_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Group_2_0](#schemagroup_2_0)|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|
|total|number|false|none|Total number of search results.  Only returned by the search API's when `summarize` is set to true.|

<h2 id="tocS_DeviceList">DeviceList</h2>
<!-- backwards compatibility -->
<a id="schemadevicelist"></a>
<a id="schema_DeviceList"></a>
<a id="tocSdevicelist"></a>
<a id="tocsdevicelist"></a>

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  },
  "total": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Device_1_0](#schemadevice_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[Device_2_0](#schemadevice_2_0)|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|
|total|number|false|none|Total number of search results.  Only returned by the search API's when `summarize` is set to true.|

<h2 id="tocS_DeviceProfileList">DeviceProfileList</h2>
<!-- backwards compatibility -->
<a id="schemadeviceprofilelist"></a>
<a id="schema_DeviceProfileList"></a>
<a id="tocSdeviceprofilelist"></a>
<a id="tocsdeviceprofilelist"></a>

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "profileId": "string"
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
|results|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[DeviceProfile_1_0](#schemadeviceprofile_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[DeviceProfile_2_0](#schemadeviceprofile_2_0)|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_GroupProfileList">GroupProfileList</h2>
<!-- backwards compatibility -->
<a id="schemagroupprofilelist"></a>
<a id="schema_GroupProfileList"></a>
<a id="tocSgroupprofilelist"></a>
<a id="tocsgroupprofilelist"></a>

```json
{
  "results": [
    {
      "category": "group",
      "groupPath": "string",
      "templateId": "string",
      "name": "string",
      "parentPath": "string",
      "description": "string",
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "profileId": "string"
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
|results|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[GroupProfile_1_0](#schemagroupprofile_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|[GroupProfile_2_0](#schemagroupprofile_2_0)|false|none|none|

continued

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_SearchResults">SearchResults</h2>
<!-- backwards compatibility -->
<a id="schemasearchresults"></a>
<a id="schema_SearchResults"></a>
<a id="tocSsearchresults"></a>
<a id="tocssearchresults"></a>

```json
{
  "results": [
    {
      "category": "group",
      "deviceId": "string",
      "templateId": "string",
      "description": "string",
      "awsIotThingArn": "string",
      "imageUrl": "string",
      "connected": true,
      "state": "unprovisioned",
      "assemblyOf": null,
      "components": [
        null
      ],
      "attributes": {},
      "relation": "string",
      "direction": "in",
      "groups": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      },
      "devices": {
        "property1": [
          "string"
        ],
        "property2": [
          "string"
        ]
      }
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[oneOf]|false|none|none|

oneOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|any|false|none|none|

anyOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|[Device_1_0](#schemadevice_1_0)|false|none|none|

or

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|[Group_1_0](#schemagroup_1_0)|false|none|none|

xor

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|» *anonymous*|any|false|none|none|

anyOf

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|[Device_2_0](#schemadevice_2_0)|false|none|none|

or

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|»» *anonymous*|[Group_2_0](#schemagroup_2_0)|false|none|none|

<h2 id="tocS_TemplateInfo">TemplateInfo</h2>
<!-- backwards compatibility -->
<a id="schematemplateinfo"></a>
<a id="schema_TemplateInfo"></a>
<a id="tocStemplateinfo"></a>
<a id="tocstemplateinfo"></a>

```json
{
  "templateId": "string",
  "category": "device",
  "schema": {
    "version": 0,
    "definition": {
      "properties": {
        "property1": "string",
        "property2": "string"
      },
      "required": [
        "string"
      ],
      "relations": {
        "out": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        },
        "in": {
          "property1": [
            "string"
          ],
          "property2": [
            "string"
          ]
        }
      }
    },
    "status": "draft"
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|templateId|string|false|none|Unique ID of template|
|category|string|false|none|Category of template|
|schema|object|false|none|none|
|» version|number|false|none|Version of template definition (auto-incrementing)|
|» definition|[TemplateDefinition](#schematemplatedefinition)|false|none|none|
|» status|string|false|none|Status of template|

#### Enumerated Values

|Property|Value|
|---|---|
|category|device|
|category|group|
|status|draft|
|status|published|

<h2 id="tocS_TemplateDefinition">TemplateDefinition</h2>
<!-- backwards compatibility -->
<a id="schematemplatedefinition"></a>
<a id="schema_TemplateDefinition"></a>
<a id="tocStemplatedefinition"></a>
<a id="tocstemplatedefinition"></a>

```json
{
  "properties": {
    "property1": "string",
    "property2": "string"
  },
  "required": [
    "string"
  ],
  "relations": {
    "out": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    },
    "in": {
      "property1": [
        "string"
      ],
      "property2": [
        "string"
      ]
    }
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|properties|object|false|none|Map of allowed properties (string, number, boolean and datetime types allowed only)|
|» **additionalProperties**|string|false|none|none|
|required|[string]|false|none|List of required properties|
|relations|object|false|none|none|
|» out|object|false|none|Map of defined relationships from this template to others|
|»» **additionalProperties**|[string]|false|none|none|
|» in|object|false|none|Map of defined relationships from other templates to this|
|»» **additionalProperties**|[string]|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|**additionalProperties**|string|
|**additionalProperties**|number|
|**additionalProperties**|boolean|
|**additionalProperties**|datettime|

<h2 id="tocS_Policy">Policy</h2>
<!-- backwards compatibility -->
<a id="schemapolicy"></a>
<a id="schema_Policy"></a>
<a id="tocSpolicy"></a>
<a id="tocspolicy"></a>

```json
{
  "policyId": "string",
  "type": "string",
  "description": "string",
  "appliesTo": [
    "string"
  ],
  "document": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|policyId|string|false|none|unique ID of policy|
|type|string|false|none|type of policy|
|description|string|false|none|description of policy|
|appliesTo|[string]|false|none|the paths of the group that this policy applies to|
|document|string|false|none|the policy document (e.g. a provisioning template)|

<h2 id="tocS_PolicyList">PolicyList</h2>
<!-- backwards compatibility -->
<a id="schemapolicylist"></a>
<a id="schema_PolicyList"></a>
<a id="tocSpolicylist"></a>
<a id="tocspolicylist"></a>

```json
{
  "policies": [
    {
      "policyId": "string",
      "type": "string",
      "description": "string",
      "appliesTo": [
        "string"
      ],
      "document": "string"
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
|policies|[[Policy](#schemapolicy)]|false|none|a list of policies|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

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

