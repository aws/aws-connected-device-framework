Connected Device Framework: Provisioning
========================================
The provisioning service utilizes [AWS IoT Device Provisioning](https://docs.aws.amazon.com/iot/latest/developerguide/iot-provision.html) to provide both programmatic (just-in-time) and bulk device provisioning capabilities.  The provisioning service simplifies the use of AWS IoT Device Provisioning by allowing for the use of S3 based provisioning templates, and abstracting a standard interface over both device provisioning capabilities.

In addition, the CDF Provisioning Service allows for extending the capabilities of the AWS IoT Device Provisioning templating functionality.  To provide an example, the AWS IoT Device Provisioning allows for creating certificate resources by providing a certificate signing request (CSR), a certificate ID of an existing device certificate, or a device certificate created with a CA certificate registered with AWS IoT.  This service extends these capabilities by also providing the ability to automatically create (and return) new keys and certificates for a device.

If used in conjunction with the CDF Asset Library service, provisioning templates can be assigned to one or more hierarchies, and then the appropriate provisioning template obtained based on the location of an asset within a hierarchy.


**Version:** 1.0.0

### /things
---
##### ***POST***
**Summary:** Provision a new thing within the AWS IoT Device Registry

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body |  | Yes | [ProvisionRequest](#provisionrequest) |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 201 | OK | [ProvisionResponse](#provisionresponse) |
| 400 |  |  |
| 404 |  |  |

### /things/{thingName}
---
##### ***GET***
**Summary:** Retrieve details of a provisioned thing from the AWS IoT Device Registry

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| thingName | path | Name of thing | Yes | string |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [Thing](#thing) |
| 400 |  |  |
| 404 |  |  |

##### ***DELETE***
**Summary:** Delete a thing from the AWS IoT Device Registry.

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| thingName | path | Name of thing | Yes | string |

**Responses**

| Code | Description |
| ---- | ----------- |
| 204 | OK |
| 400 |  |
| 404 |  |

### /things/{thingName}/certificates
---
##### ***PATCH***
**Summary:** Sets the status of all attached certificates.

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| thingName | path | Name of thing | Yes | string |
| body | body |  | Yes | [PatchCertificateRequest](#patchcertificaterequest) |

**Responses**

| Code | Description |
| ---- | ----------- |
| 204 | OK |
| 400 |  |
| 404 |  |

### /bulkthings/{taskId}
---
##### ***GET***
**Summary:** Retrieve details about a bulk registration task

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| taskId | path | Id of the registration task | Yes | string |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [BulkRegistrationTask](#bulkregistrationtask) |
| 400 |  |  |
| 404 |  |  |

### /bulkthings
---
##### ***POST***
**Summary:** Bulk provision a set of new things within the AWS IoT Device Registry

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| body | body |  | No | [BulkRegistrationRequest](#bulkregistrationrequest) |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 201 | OK | [BulkRegistrationTask](#bulkregistrationtask) |
| 400 |  |  |
| 404 |  |  |

### Models
---

### Thing  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| thingName | string |  | No |
| arn | string |  | No |
| thingType | string |  | No |
| attributes | object |  | No |
| taskId | string |  | No |
| certificates | [ [Certificate](#certificate) ] |  | No |
| policies | [ [IotPolicy](#iotpolicy) ] |  | No |
| groups | [ [IotGroup](#iotgroup) ] |  | No |

### Certificate  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| certificateId | string |  | No |
| arn | string |  | No |
| certificateStatus | string |  | No |
| certificatePem | string |  | No |

### IotPolicy  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| policyName | string |  | No |
| arn | string |  | No |
| policyDocument | string |  | No |

### IotGroup  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| groupName | string |  | No |
| arn | string |  | No |
| attributes | object |  | No |

### ProvisionRequest  

Provisiong a new thing request

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| provisioningTemplateId | string | Id of an existing provisioning template | No |
| parameters | object | Map of key value pairs for all parameters defined in the provisioning template. | No |
| cdfProvisioningParameters | object | Optional parameters used by CDF in provisioning process. | No |

### ProvisionResponse  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| certificatePem | string |  | No |
| publicKey | string |  | No |
| privateKey | string |  | No |
| resourceArns | object |  | No |

### BulkRegistrationTask  

Thing bulk registration task

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| taskId | string | Id of the registration task | No |
| status | string | Status of the task | No |
| percentageProgress | integer | Percentage complete | No |
| successCount | integer | No. assets that were provisioned successful | No |
| failureCount | integer | No. assets that failed during provisioning | No |
| creationDate | dateTime | Date/time the task was created | No |
| lastModifiedDate | dateTime | Date/time the task was last updated | No |

### BulkRegistrationTaskList  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| tasks | [ [BulkRegistrationTask](#bulkregistrationtask) ] | a list of bulk registration tasks | No |

### BulkRegistrationRequest  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| provisioningTemplateId | string | Id of an existing provisioning template | No |
| parameters | [ object ] | List containing a map of key value pairs for all parameters defined in the provisioning template.  Each element in the list represents a new thing to provision. | No |

### PatchCertificateRequest  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| certificateStatus | string | Certificate status | No |

### Error  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| message | string |  | No |