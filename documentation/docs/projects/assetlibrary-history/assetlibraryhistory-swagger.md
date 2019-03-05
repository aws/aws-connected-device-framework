Connected Device Framework: Asset Library History
=================================================
The Asset Library History service tracks changes to all devices, groups, policies, and templates within the Asset Library.


**Version:** 1.0.0

### /{category}
---
##### ***GET***
**Summary:** List all events of a given category

**Description:** List all events of a given category

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| category | path | Asset Library category | Yes | string |
| timeFrom | query | Only display category events since this time | No | dateTime |
| timeTo | query | Only display category events prior to this time | No | dateTime |
| user | query | Only display category events authored by this user | No | string |
| event | query | Only display category events of this type | No | string |
| sort | query | Sort order | No | string |
| token | query | Pagination token | No | binary |
| limit | query | Maximum no. events to return | No | number (int32) |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [Events](#events) |
| 400 |  |  |
| 404 |  |  |

### /{category}/{objectId}
---
##### ***GET***
**Summary:** List all events of a specific Asset Library object

**Description:** List all events of a specific Asset Library object

**Parameters**

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
| category | path | Asset Library category | Yes | string |
| objectId | path | Asset Library object id (deviceId, groupPath, policyId, or templateId) | Yes | string |
| timeAt | query | Return the known state of a specific object at this time | No | dateTime |
| timeFrom | query | Only display category events since this time | No | dateTime |
| timeTo | query | Only display category events prior to this time | No | dateTime |
| user | query | Only display category events authored by this user | No | string |
| event | query | Only display category events of this type | No | string |
| sort | query | Sort order | No | string |
| token | query | Pagination token | No | binary |
| limit | query | Maximum no. events to return | No | number (int32) |

**Responses**

| Code | Description | Schema |
| ---- | ----------- | ------ |
| 200 | OK | [Events](#events) |
| 400 |  |  |
| 404 |  |  |

### Models
---

### Event  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| objectId | string | DeviceId, groupPath, policyId or templateId of the object. | No |
| type | string | category of object. | No |
| time | dateTime | Date/time of event. | No |
| event | string | Event type. | No |
| user | string | User who authored the change. | No |
| state | object | Full json representation of the object (e.g. a Device) at the time the change was made. | No |

### Events  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| results | [ [Event](#event) ] |  | No |
| pagination | object |  | No |

### Error  

| Name | Type | Description | Required |
| ---- | ---- | ----------- | -------- |
| message | string |  | No |