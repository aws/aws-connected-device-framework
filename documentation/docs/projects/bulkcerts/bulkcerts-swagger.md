# Connected Device Framework: Bulk Certs
REST API for bulk creating certificates.

## Version: 1.0.0

### /certificates

#### POST
##### Summary:

Creates a batch of certificates.


##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body |  | Yes | [BulkCertificatesTaskRequest](#bulkcertificatestaskrequest) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 202 | Created successfully | [BulkCertificatesTaskResponse](#bulkcertificatestaskresponse) |
| 400 |  |  |

### /certificates/{taskId}

#### GET
##### Summary:

Retrieve a batch of pre-generated certificates (the outcome of a batch certificate creation task)

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| taskId | path | Id of the bulk certificate creation task | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Zipfile of certificates | file |
| 303 | If certificate creation is still inprogress, a redirect to the certificate task status |  |
| 404 |  |  |

### /certificates/{taskId}/task

#### GET
##### Summary:

Retrieve status of a bulk certificates task

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| taskId | path | Id of the bulk certificate creation task | Yes | string |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | Pending | [BulkCertificatesTaskStatusResponse](#bulkcertificatestaskstatusresponse) |
| 400 |  |  |
| 404 |  |  |

### /supplier/{supplierId}/certificates

#### POST
##### Summary:

Creates a batch of certificates for a supplier, using a supplier's specific CA.


##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| supplierId | path | Id supplier for which to create certificates | Yes | string |
| body | body |  | Yes | [BulkCertificatesTaskRequest](#bulkcertificatestaskrequest) |

##### Responses

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 202 | Created successfully | [BulkCertificatesTaskResponse](#bulkcertificatestaskresponse) |
| 400 |  |  |

### Models


#### BulkCertificatesTaskRequest

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| quantity | number |  | No |
| register | boolean |  | No |

#### BulkCertificatesTaskResponse

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| BulkCertificatesTaskResponse | object |  |  |

#### BulkCertificatesTaskStatusResponse

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| taskId | string | ID of the bulk certificates creation task | No |
| status | string | status of the task | No |
| batchDate | number | batch start date time | No |
| chunksPending | number | number of certificate chunks yet to be completed | No |
| chunksTotal | number | total number of chunks in this batch | No |

#### Error

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| message | string |  | No |