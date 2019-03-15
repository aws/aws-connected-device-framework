# Connected Device Framework: Commands Service


## Version: 1.0.0

### /templates

#### POST
##### Summary:

Registers a new job template.


##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body |  | Yes | [Template](#template) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 201 |  |  |
| 400 |  |  |
| 409 | Template already exists | [Conflict](#conflict) |
| 500 |  |  |

#### GET
##### Summary:

Returns a list of all job templates

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Success | [TemplateList](#templatelist) |
| 500 |  |  |

### /templates/{templateId}

#### GET
##### Summary:

Returns a specific template

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| templateId | path | ID of job template | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Success | [Template](#template) |
| 400 |  |  |
| 404 |  |  |
| 500 |  |  |

#### PATCH
##### Summary:

Updates a specific template

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| templateId | path | ID of job template | Yes | string |
| body | body |  | Yes | [Template](#template) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | Success |
| 400 |  |
| 404 |  |
| 500 |  |

#### DELETE
##### Summary:

Deleets a specific template

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| templateId | path | ID of job template | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | Success |
| 400 |  |
| 500 |  |

### /commands

#### POST
##### Summary:

Submits a new command.


##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body |  | Yes | [Command](#command) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 |  |
| 400 |  |

#### GET
##### Summary:

Returns a list of all commands

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| status | query |  | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [CommandList](#commandlist) |
| 400 |  |  |
| 404 |  |  |

### /commands/{commandId}

#### GET
##### Summary:

Returns a specific command

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [Command](#command) |
| 400 |  |  |
| 404 |  |  |

#### PATCH
##### Summary:

Updates a specific command, including setting its status to `in_progress` to start the command.

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| body | body |  | Yes | [Command](#command) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | OK |
| 400 |  |
| 404 |  |

### /commands/{commandId}/files/{fileId}

#### PUT
##### Summary:

Uploads a file required for the command

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| fileId | path | ID of file as defined in the templates `requiredFiles` attribute | Yes | string |
| file | formData |  | No | file |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 |  |
| 400 |  |

#### DELETE
##### Summary:

Removes a file from the command


##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| fileId | path | ID of file as defined in the templates `requiredFiles` attribute | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | OK |
| 400 |  |
| 404 |  |

### /commands/{commandId}/executions

#### GET
##### Summary:

Lists the executions of a command

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| status | query |  | No | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [ExecutionSummaryList](#executionsummarylist) |
| 400 |  |  |
| 404 |  |  |

### /commands/{commandId}/executions/{thingName}

#### GET
##### Summary:

Returns execution details of a specific command for a specific thing

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| thingName | path | Name of thing | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [ExecutionList](#executionlist) |
| 400 |  |  |
| 404 |  |  |

#### DELETE
##### Summary:

Cancels an execution for a specific thing

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| commandId | path | ID of command | Yes | string |
| thingName | path | Name of thing | Yes | string |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 | OK |
| 400 |  |
| 404 |  |

### Models


#### TemplateSummary

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| templateId | string |  | No |
| description | string |  | No |

#### Template

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| templateId | string |  | No |
| operation | string |  | No |
| description | string |  | No |
| document | string |  | No |
| requiredDocumentParameters | [ string ] |  | No |
| requiredFiles | [ string ] |  | No |
| presignedUrlExpiresInSeconds | integer |  | No |

#### TemplateList

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| results | [ [TemplateSummary](#templatesummary) ] |  | No |
| pagination | object |  | No |

#### Command

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| commandId | string |  | No |
| templateId | string |  | No |
| status | string |  | No |
| targets | [ string ] |  | No |
| documentParameters | object |  | No |
| files | object |  | No |
| type | string |  | No |
| rolloutMaximumPerMinute | undefined (integer) |  | No |
| jobId | string |  | No |

#### File

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| bucketName | string |  | No |
| s3ObjectKey | string |  | No |

#### CommandList

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| results | [ [Command](#command) ] |  | No |
| pagination | object |  | No |

#### Execution

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| thingName | string |  | No |
| createdAt | string |  | No |
| lastUpdatedAt | string |  | No |
| queuedAt | string |  | No |
| startedAt | string |  | No |
| status | string |  | No |
| percentComplete | number |  | No |

#### ExecutionList

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| executions | [ [Execution](#execution) ] |  | No |

#### ExecutionSummary

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| thingName | string |  | No |
| status | string |  | No |

#### ExecutionSummaryList

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| executions | [ [ExecutionSummary](#executionsummary) ] |  | No |

#### Error

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| error | string |  | No |