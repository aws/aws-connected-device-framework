---
title: "Connected Device Framework: Commands Service v1.0.0"
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

<h1 id="connected-device-framework-commands-service">Connected Device Framework: Commands Service v1.0.0</h1>

> Scroll down for code samples, example requests and responses. Select a language for code samples from the tabs above or the mobile navigation menu.

<h1 id="connected-device-framework-commands-service-templates">Templates</h1>

A `Template` represents a command template that is used to manage what needs defining for any particular command as well as how to execute the command.

The main component to a template is its `document`, a json document that is broadcast to all recipients (devices) of a command.  

The `document` may contain tokens to reference parameters.  These are added to the `document` in the format of `${name}`.  In addition the parameters should be defined as part of `requiredDocumentParameters` which enforces all `Commands` of the template to provide.

A `document` may also reference files.  These are added to the `document` in the format of `${cdf:file:name}`, and in addition added to `requiredFiles`.  The files required for the template must be uploaded to the `Command` before it can be published.  Once the job has been created, these tokens are replaced with pre-signed S3 url's.

## Registers a new job template.

<a id="opIdcreateTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /templates \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/templates', headers = headers)

print(r.json())

```

`POST /templates`

> Body parameter

```json
{
  "templateId": "string",
  "operation": "string",
  "description": "string",
  "document": "string",
  "requiredDocumentParameters": [
    "string"
  ],
  "requiredFiles": [
    "string"
  ],
  "presignedUrlExpiresInSeconds": 0
}
```

<h3 id="registers-a-new-job-template.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Template](#schematemplate)|true|none|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="registers-a-new-job-template.
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|201|[Created](https://tools.ietf.org/html/rfc7231#section-6.3.2)|Created successfully|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|409|[Conflict](https://tools.ietf.org/html/rfc7231#section-6.5.8)|Template already exists|[#/components/responses/Conflict](#schema#/components/responses/conflict)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Server error|[Error](#schemaerror)|

### Response Headers

|Status|Header|Type|Format|Description|
|---|---|---|---|---|
|201|location|string||none|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a list of all job templates

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
  "results": [
    {
      "templateId": "string",
      "description": "string"
    }
  ],
  "pagination": {
    "maxResults": 0,
    "nextToken": "string"
  }
}
```

<h3 id="returns-a-list-of-all-job-templates-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Success|[TemplateList](#schematemplatelist)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Server error|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a specific template

<a id="opIdgetTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /templates/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/templates/{templateId}', headers = headers)

print(r.json())

```

`GET /templates/{templateId}`

<h3 id="returns-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of job template|

> Example responses

> 200 Response

```json
{
  "templateId": "string",
  "operation": "string",
  "description": "string",
  "document": "string",
  "requiredDocumentParameters": [
    "string"
  ],
  "requiredFiles": [
    "string"
  ],
  "presignedUrlExpiresInSeconds": 0
}
```

<h3 id="returns-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|Success|[Template](#schematemplate)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Server error|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Updates a specific template

<a id="opIdpatchTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /templates/{templateId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/templates/{templateId}', headers = headers)

print(r.json())

```

`PATCH /templates/{templateId}`

> Body parameter

```json
{
  "templateId": "string",
  "operation": "string",
  "description": "string",
  "document": "string",
  "requiredDocumentParameters": [
    "string"
  ],
  "requiredFiles": [
    "string"
  ],
  "presignedUrlExpiresInSeconds": 0
}
```

<h3 id="updates-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Template](#schematemplate)|true|none|
|templateId|path|string|true|ID of job template|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="updates-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|Success|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Server error|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Deleets a specific template

<a id="opIddeleteTemplate"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /templates/{templateId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/templates/{templateId}', headers = headers)

print(r.json())

```

`DELETE /templates/{templateId}`

<h3 id="deleets-a-specific-template-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|templateId|path|string|true|ID of job template|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="deleets-a-specific-template-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|Success|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|500|[Internal Server Error](https://tools.ietf.org/html/rfc7231#section-6.6.1)|Server error|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-commands-service-commands">Commands</h1>

A `Command` represents a command (as defined by a specific template) sent to a device or groups of devices for local execution.

A `Command` must have any parameters and files configured that have been defined as part of the `Template` before it can be published.

## Submits a new command.

<a id="opIdcreateCommand"></a>

> Code samples

```shell
# You can also use wget
curl -X POST /commands \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.post('/commands', headers = headers)

print(r.json())

```

`POST /commands`

> Body parameter

```json
{
  "commandId": "string",
  "templateId": "string",
  "status": "draft",
  "targets": [
    "string"
  ],
  "targetQuery": {
    "types": [
      "string"
    ],
    "ancestorPath": "string",
    "eq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "neq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "startsWith": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ]
  },
  "documentParameters": {
    "property1": "string",
    "property2": "string"
  },
  "files": {
    "property1": "string",
    "property2": "string"
  },
  "type": "SNAPSHOT",
  "rolloutMaximumPerMinute": null,
  "jobId": "string"
}
```

<h3 id="submits-a-new-command.
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Command](#schemacommand)|true|none|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="submits-a-new-command.
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

## Returns a list of all commands

<a id="opIdlistCommands"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /commands \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/commands', headers = headers)

print(r.json())

```

`GET /commands`

<h3 id="returns-a-list-of-all-commands-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|status|query|string|false|none|

> Example responses

> 200 Response

```json
{
  "results": [
    {
      "commandId": "string",
      "templateId": "string",
      "status": "draft",
      "targets": [
        "string"
      ],
      "targetQuery": {
        "types": [
          "string"
        ],
        "ancestorPath": "string",
        "eq": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "neq": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "lt": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "lte": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "gt": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "gte": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "startsWith": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ]
      },
      "documentParameters": {
        "property1": "string",
        "property2": "string"
      },
      "files": {
        "property1": "string",
        "property2": "string"
      },
      "type": "SNAPSHOT",
      "rolloutMaximumPerMinute": null,
      "jobId": "string"
    }
  ],
  "pagination": {
    "offset": 0,
    "count": 0
  }
}
```

<h3 id="returns-a-list-of-all-commands-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[CommandList](#schemacommandlist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns a specific command

<a id="opIdgetCommand"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /commands/{commandId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/commands/{commandId}', headers = headers)

print(r.json())

```

`GET /commands/{commandId}`

<h3 id="returns-a-specific-command-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|commandId|path|string|true|ID of command|

> Example responses

> 200 Response

```json
{
  "commandId": "string",
  "templateId": "string",
  "status": "draft",
  "targets": [
    "string"
  ],
  "targetQuery": {
    "types": [
      "string"
    ],
    "ancestorPath": "string",
    "eq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "neq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "startsWith": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ]
  },
  "documentParameters": {
    "property1": "string",
    "property2": "string"
  },
  "files": {
    "property1": "string",
    "property2": "string"
  },
  "type": "SNAPSHOT",
  "rolloutMaximumPerMinute": null,
  "jobId": "string"
}
```

<h3 id="returns-a-specific-command-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[Command](#schemacommand)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Updates a specific command, including setting its status to `in_progress` to start the command.

<a id="opIdpatchCommand"></a>

> Code samples

```shell
# You can also use wget
curl -X PATCH /commands/{commandId} \
  -H 'Content-Type: application/vnd.aws-cdf-v1.0+json' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'application/vnd.aws-cdf-v1.0+json',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.patch('/commands/{commandId}', headers = headers)

print(r.json())

```

`PATCH /commands/{commandId}`

> Body parameter

```json
{
  "commandId": "string",
  "templateId": "string",
  "status": "draft",
  "targets": [
    "string"
  ],
  "targetQuery": {
    "types": [
      "string"
    ],
    "ancestorPath": "string",
    "eq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "neq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "startsWith": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ]
  },
  "documentParameters": {
    "property1": "string",
    "property2": "string"
  },
  "files": {
    "property1": "string",
    "property2": "string"
  },
  "type": "SNAPSHOT",
  "rolloutMaximumPerMinute": null,
  "jobId": "string"
}
```

<h3 id="updates-a-specific-command,-including-setting-its-status-to-`in_progress`-to-start-the-command.-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|[Command](#schemacommand)|true|none|
|commandId|path|string|true|ID of command|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="updates-a-specific-command,-including-setting-its-status-to-`in_progress`-to-start-the-command.-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Uploads a file required for the command

<a id="opIduploadCommandFile"></a>

> Code samples

```shell
# You can also use wget
curl -X PUT /commands/{commandId}/files/{fileId} \
  -H 'Content-Type: multipart/form-data' \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Content-Type': 'multipart/form-data',
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.put('/commands/{commandId}/files/{fileId}', headers = headers)

print(r.json())

```

`PUT /commands/{commandId}/files/{fileId}`

> Body parameter

```yaml
file: string

```

<h3 id="uploads-a-file-required-for-the-command-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|body|body|object|false|none|
|» file|body|string(binary)|false|none|
|commandId|path|string|true|ID of command|
|fileId|path|string|true|ID of file as defined in the templates `requiredFiles` attribute|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="uploads-a-file-required-for-the-command-responses">Responses</h3>

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

## Removes a file from the command

<a id="opIdremoveCommandFile"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /commands/{commandId}/files/{fileId} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/commands/{commandId}/files/{fileId}', headers = headers)

print(r.json())

```

`DELETE /commands/{commandId}/files/{fileId}`

<h3 id="removes-a-file-from-the-command
-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|commandId|path|string|true|ID of command|
|fileId|path|string|true|ID of file as defined in the templates `requiredFiles` attribute|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="removes-a-file-from-the-command
-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

<h1 id="connected-device-framework-commands-service-executions">Executions</h1>

An `Execution` represents a specific local execution of a command at the device.

## Lists the executions of a command

<a id="opIdlistExecutions"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /commands/{commandId}/executions \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/commands/{commandId}/executions', headers = headers)

print(r.json())

```

`GET /commands/{commandId}/executions`

<h3 id="lists-the-executions-of-a-command-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|status|query|string|false|none|
|commandId|path|string|true|ID of command|

> Example responses

> 200 Response

```json
{
  "executions": [
    {
      "thingName": "string",
      "status": "string"
    }
  ]
}
```

<h3 id="lists-the-executions-of-a-command-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[ExecutionSummaryList](#schemaexecutionsummarylist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Returns execution details of a specific command for a specific thing

<a id="opIdgetThingExecution"></a>

> Code samples

```shell
# You can also use wget
curl -X GET /commands/{commandId}/executions/{thingName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.get('/commands/{commandId}/executions/{thingName}', headers = headers)

print(r.json())

```

`GET /commands/{commandId}/executions/{thingName}`

<h3 id="returns-execution-details-of-a-specific-command-for-a-specific-thing-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|commandId|path|string|true|ID of command|
|thingName|path|string|true|Name of thing|

> Example responses

> 200 Response

```json
{
  "executions": [
    {
      "thingName": "string",
      "createdAt": "string",
      "lastUpdatedAt": "string",
      "queuedAt": "string",
      "startedAt": "string",
      "status": "string",
      "percentComplete": 0
    }
  ]
}
```

<h3 id="returns-execution-details-of-a-specific-command-for-a-specific-thing-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|200|[OK](https://tools.ietf.org/html/rfc7231#section-6.3.1)|OK|[ExecutionList](#schemaexecutionlist)|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

## Cancels an execution for a specific thing

<a id="opIddeleteThingExecution"></a>

> Code samples

```shell
# You can also use wget
curl -X DELETE /commands/{commandId}/executions/{thingName} \
  -H 'Accept: application/vnd.aws-cdf-v1.0+json'

```

```python
import requests
headers = {
  'Accept': 'application/vnd.aws-cdf-v1.0+json'
}

r = requests.delete('/commands/{commandId}/executions/{thingName}', headers = headers)

print(r.json())

```

`DELETE /commands/{commandId}/executions/{thingName}`

<h3 id="cancels-an-execution-for-a-specific-thing-parameters">Parameters</h3>

|Name|In|Type|Required|Description|
|---|---|---|---|---|
|commandId|path|string|true|ID of command|
|thingName|path|string|true|Name of thing|

> Example responses

> 400 Response

```json
{
  "error": "string"
}
```

<h3 id="cancels-an-execution-for-a-specific-thing-responses">Responses</h3>

|Status|Meaning|Description|Schema|
|---|---|---|---|
|204|[No Content](https://tools.ietf.org/html/rfc7231#section-6.3.5)|OK|None|
|400|[Bad Request](https://tools.ietf.org/html/rfc7231#section-6.5.1)|Invalid input|[Error](#schemaerror)|
|404|[Not Found](https://tools.ietf.org/html/rfc7231#section-6.5.4)|Not found|[Error](#schemaerror)|

<aside class="success">
This operation does not require authentication
</aside>

# Schemas

<h2 id="tocS_TemplateSummary">TemplateSummary</h2>
<!-- backwards compatibility -->
<a id="schematemplatesummary"></a>
<a id="schema_TemplateSummary"></a>
<a id="tocStemplatesummary"></a>
<a id="tocstemplatesummary"></a>

```json
{
  "templateId": "string",
  "description": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|templateId|string|false|none|none|
|description|string|false|none|none|

<h2 id="tocS_Template">Template</h2>
<!-- backwards compatibility -->
<a id="schematemplate"></a>
<a id="schema_Template"></a>
<a id="tocStemplate"></a>
<a id="tocstemplate"></a>

```json
{
  "templateId": "string",
  "operation": "string",
  "description": "string",
  "document": "string",
  "requiredDocumentParameters": [
    "string"
  ],
  "requiredFiles": [
    "string"
  ],
  "presignedUrlExpiresInSeconds": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|templateId|string|false|none|none|
|operation|string|false|none|none|
|description|string|false|none|none|
|document|string|false|none|none|
|requiredDocumentParameters|[string]|false|none|none|
|requiredFiles|[string]|false|none|none|
|presignedUrlExpiresInSeconds|integer|false|none|none|

<h2 id="tocS_TemplateList">TemplateList</h2>
<!-- backwards compatibility -->
<a id="schematemplatelist"></a>
<a id="schema_TemplateList"></a>
<a id="tocStemplatelist"></a>
<a id="tocstemplatelist"></a>

```json
{
  "results": [
    {
      "templateId": "string",
      "description": "string"
    }
  ],
  "pagination": {
    "maxResults": 0,
    "nextToken": "string"
  }
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|results|[[TemplateSummary](#schematemplatesummary)]|false|none|none|
|pagination|object|false|none|none|
|» maxResults|number|false|none|none|
|» nextToken|string|false|none|none|

<h2 id="tocS_Command">Command</h2>
<!-- backwards compatibility -->
<a id="schemacommand"></a>
<a id="schema_Command"></a>
<a id="tocScommand"></a>
<a id="tocscommand"></a>

```json
{
  "commandId": "string",
  "templateId": "string",
  "status": "draft",
  "targets": [
    "string"
  ],
  "targetQuery": {
    "types": [
      "string"
    ],
    "ancestorPath": "string",
    "eq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "neq": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "lte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gt": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "gte": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ],
    "startsWith": [
      {
        "traversals": {
          "relation": "string",
          "direction": "string"
        },
        "field": "string",
        "value": "string"
      }
    ]
  },
  "documentParameters": {
    "property1": "string",
    "property2": "string"
  },
  "files": {
    "property1": "string",
    "property2": "string"
  },
  "type": "SNAPSHOT",
  "rolloutMaximumPerMinute": null,
  "jobId": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|commandId|string|false|none|none|
|templateId|string|false|none|none|
|status|string|false|none|none|
|targets|[string]|false|none|none|
|targetQuery|object|false|none|none|
|» types|[string]|false|none|none|
|» ancestorPath|string|false|none|none|
|» eq|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» neq|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» lt|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» lte|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» gt|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» gte|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|» startsWith|[object]|false|none|none|
|»» traversals|object|false|none|none|
|»»» relation|string|false|none|none|
|»»» direction|string|false|none|none|
|»» field|string|false|none|none|
|»» value|string|false|none|none|
|documentParameters|object|false|none|none|
|» **additionalProperties**|string|false|none|none|
|files|object|false|none|none|
|» **additionalProperties**|string|false|none|none|
|type|string|false|none|none|
|rolloutMaximumPerMinute|any|false|none|none|
|jobId|string|false|none|none|

#### Enumerated Values

|Property|Value|
|---|---|
|status|draft|
|status|in_progress|
|status|cancelled|
|status|deleted|
|status|completed|
|type|SNAPSHOT|
|type|CONTINUOUS|

<h2 id="tocS_File">File</h2>
<!-- backwards compatibility -->
<a id="schemafile"></a>
<a id="schema_File"></a>
<a id="tocSfile"></a>
<a id="tocsfile"></a>

```json
{
  "bucketName": "string",
  "s3ObjectKey": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|bucketName|string|false|none|none|
|s3ObjectKey|string|false|none|none|

<h2 id="tocS_CommandList">CommandList</h2>
<!-- backwards compatibility -->
<a id="schemacommandlist"></a>
<a id="schema_CommandList"></a>
<a id="tocScommandlist"></a>
<a id="tocscommandlist"></a>

```json
{
  "results": [
    {
      "commandId": "string",
      "templateId": "string",
      "status": "draft",
      "targets": [
        "string"
      ],
      "targetQuery": {
        "types": [
          "string"
        ],
        "ancestorPath": "string",
        "eq": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "neq": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "lt": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "lte": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "gt": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "gte": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ],
        "startsWith": [
          {
            "traversals": {
              "relation": "string",
              "direction": "string"
            },
            "field": "string",
            "value": "string"
          }
        ]
      },
      "documentParameters": {
        "property1": "string",
        "property2": "string"
      },
      "files": {
        "property1": "string",
        "property2": "string"
      },
      "type": "SNAPSHOT",
      "rolloutMaximumPerMinute": null,
      "jobId": "string"
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
|results|[[Command](#schemacommand)]|false|none|none|
|pagination|object|false|none|none|
|» offset|integer|false|none|none|
|» count|integer|false|none|none|

<h2 id="tocS_Execution">Execution</h2>
<!-- backwards compatibility -->
<a id="schemaexecution"></a>
<a id="schema_Execution"></a>
<a id="tocSexecution"></a>
<a id="tocsexecution"></a>

```json
{
  "thingName": "string",
  "createdAt": "string",
  "lastUpdatedAt": "string",
  "queuedAt": "string",
  "startedAt": "string",
  "status": "string",
  "percentComplete": 0
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|thingName|string|false|none|none|
|createdAt|string|false|none|none|
|lastUpdatedAt|string|false|none|none|
|queuedAt|string|false|none|none|
|startedAt|string|false|none|none|
|status|string|false|none|none|
|percentComplete|number|false|none|none|

<h2 id="tocS_ExecutionList">ExecutionList</h2>
<!-- backwards compatibility -->
<a id="schemaexecutionlist"></a>
<a id="schema_ExecutionList"></a>
<a id="tocSexecutionlist"></a>
<a id="tocsexecutionlist"></a>

```json
{
  "executions": [
    {
      "thingName": "string",
      "createdAt": "string",
      "lastUpdatedAt": "string",
      "queuedAt": "string",
      "startedAt": "string",
      "status": "string",
      "percentComplete": 0
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|executions|[[Execution](#schemaexecution)]|false|none|none|

<h2 id="tocS_ExecutionSummary">ExecutionSummary</h2>
<!-- backwards compatibility -->
<a id="schemaexecutionsummary"></a>
<a id="schema_ExecutionSummary"></a>
<a id="tocSexecutionsummary"></a>
<a id="tocsexecutionsummary"></a>

```json
{
  "thingName": "string",
  "status": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|thingName|string|false|none|none|
|status|string|false|none|none|

<h2 id="tocS_ExecutionSummaryList">ExecutionSummaryList</h2>
<!-- backwards compatibility -->
<a id="schemaexecutionsummarylist"></a>
<a id="schema_ExecutionSummaryList"></a>
<a id="tocSexecutionsummarylist"></a>
<a id="tocsexecutionsummarylist"></a>

```json
{
  "executions": [
    {
      "thingName": "string",
      "status": "string"
    }
  ]
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|executions|[[ExecutionSummary](#schemaexecutionsummary)]|false|none|none|

<h2 id="tocS_Error">Error</h2>
<!-- backwards compatibility -->
<a id="schemaerror"></a>
<a id="schema_Error"></a>
<a id="tocSerror"></a>
<a id="tocserror"></a>

```json
{
  "error": "string"
}

```

### Properties

|Name|Type|Required|Restrictions|Description|
|---|---|---|---|---|
|error|string|false|none|none|

