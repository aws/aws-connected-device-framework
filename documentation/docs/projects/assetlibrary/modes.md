# ASSET LIBRARY MODES

## Introduction

The Asset Library is capable of running in one of two modes:  `full` and `lite`.

The `lite` version uses The AWS IoT Device Registry to store all devices and groups data, whereas the `full` version utilizes AWS Neptune to augment the AWS IoT Device Registry to provide more advanced data modelling features.

The mode is determined via a comfiguration property that is to be provided at the time of deployment.  The following describes the differences in functionality between the two modes.


## Supported Functionality by REST API

The following table indicates which REST API's are available in which mode:

### Devices

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /devices` | Adds a new device to the Asset Library | ✅ (adding to a default parent group if none provided) | ✅ (creating components not supported, and no default parent group set if none provided) |
| `POST /bulkdevices` | Adds a batch of devices to the Asset Library | ✅ | ✅ (see `POST /devices`) |
| `PATCH /bulkdevices` | Updates a batch of existing devices | ✅ | ⛔ |
| `GET /devices/{deviceId}` | Find a device by ID | ✅ | ✅ |
| `DELETE /devices/{deviceId}` | Delete a device | ✅ | ✅ |
| `PATCH /devices/{deviceId}` | Performs a partial update of an existing device | ✅ | ✅ (supports optimistic locking by providing an optional `expectedVersion`.  If not provided, the latest version of the device will be updated) |
| `PUT /devices/{deviceId}/{relationship}/groups/{groupPath}` | Associates a device to a a group, giving context to its relationship | ✅ | ✅ (does not support providing context to the relationship - only supported value for `relatiobship` is `group`) |
| `DELETE /devices/{deviceId}/{relationship}/groups/{groupPath}` | Removes a device from an associated group | ✅ | ✅ (only supported value for `relationship` is `group`) |
| `PUT /devices/{deviceId}/{relationship}/devices/{otherDeviceId}` | Associates a device to another device, giving context to its relationship | ✅ | ⛔ |
| `DELETE /devices/{deviceId}/{relationship}/devices/{otherDeviceId}` | Removes a device from an associated device | ✅ | ⛔ |
| `POST /devices/{deviceId}/components` | Creates a new component and adds to the device | ✅ | ⛔ |
| `PATCH /devices/{deviceId}/components/{componentId}` | Updates the component of a device | ✅ | ⛔ |
| `DELETE /devices/{deviceId}/components/{componentId}` | Deletes a component of a device | ✅ | ⛔ |


### Groups

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /groups` | Adds a new group to the device library as a child of the `parentPath` as specified in the request body | ✅ | ✅ (specifying a parent is optional, specifying a template is not supported, and linking groups to other groups not supported) |
| `POST /bulkgroups` | Adds a batch of new group to the asset library as a child of the `parentPath` as specified in the request body | ✅ | ✅ (see `POST /groups`) |
| `GET /groups/{groupPath}` | Find group by Group's path | ✅ | ✅ |
| `DELETE /groups/{groupPath}` | Delete group with supplied path | ✅ | ✅ |
| `PATCH /groups/{groupPath}` | Update an existing group's attributes, including changing its parent group | ✅ | ✅ (see `POST /groups`) |
| `GET /groups/{groupPath}/members/devices` | List device members of group for supplied Group name | ✅ | ✅ (filtering by template or state not supported) |
| `GET /groups/{groupPath}/members/groups` | List group members of group for supplied Group name | ✅ | ✅ (filtering by template not supported) |
| `GET /groups/{groupPath}/memberships` | List all ancestor groups of a specific group | ✅ | ✅ |
| `PUT /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}` | Associates a group with another group, giving context to its relationship | ✅ | ⛔ |
| `DELETE /groups/{sourceGroupPath}/{relationship}/groups/{targetGroupPath}` | Removes a group from an associated group | ✅ | ⛔ |

### Device Templates

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /templates/devices/{templateId}` | Registers a new device template within the system, using the JSON Schema standard to define the device template attributes and constraints | ✅ | ✅ (string types supported only, defining allowed relations to other group types not supported, and required attributes not supported) |
| `GET /templates/devices/{templateId}` | Find device template by ID | ✅ | ✅ |
| `PATCH /templates/devices/{templateId}` | Update an existing device template | ✅ | ✅ (see `POST /templates/devices/{templateId}`) |
| `DELETE /templates/devices/{templateId}` | Deletes an existing device template | ✅ | ✅ (deleting a template will deprecate the Thing Type, not delete it) |
| `PUT /templates/devices/{templateId}/publish` | Publishes an existing device template | ✅ | ⛔ |

### Group Templates

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /templates/groups/{templateId}` | Registers a new group template within the system, using the JSON Schema standard to define the group template attributes and constraints | ✅ | ⛔ |
| `GET /templates/groups/{templateId}` | Find group template by ID | ✅ | ⛔ |
| `PATCH /templates/groups/{templateId}` | Update an existing group template | ✅ | ⛔ |
| `DELETE /templates/groups/{templateId}` | Deletes an existing group template | ✅ | ⛔ |
| `PUT /templates/groups/{templateId}/publish` | Publishes an existing group template | ✅ | ⛔ |

### Device Profiles

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /profiles/device/{templateId}` | Adds a new device profile for a specific template | ✅ | ⛔ |
| `GET /profiles/device/{templateId}` | Return all device profiles for a specific template | ✅ | ⛔ |
| `GET /profiles/device/{templateId}/{profileId}` | Retrieve a device profile | ✅ | ⛔ |
| `DELETE /profiles/device/{templateId}/{profileId}` | Delete a specific device profile | ✅ | ⛔ |
| `PATCH /profiles/device/{templateId}/{profileId}` | Update an existing device profile | ✅ | ⛔ |

### Group Profiles

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /profiles/group/{templateId}` | Adds a new group profile for a specific template | ✅ | ⛔ |
| `GET /profiles/group/{templateId}` | Return all group profiles for a specific template | ✅ | ⛔ |
| `GET /profiles/group/{templateId}/{profileId}` | Retrieve a group profile | ✅ | ⛔ |
| `DELETE /profiles/group/{templateId}/{profileId}` | Delete a specific group profile | ✅ | ⛔ |
| `PATCH /profiles/group/{templateId}/{profileId}` | Update an existing group profile | ✅ | ⛔ |

### Policies

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `POST /policies` | Creates a new `Policy`, and applies it to the provided `Groups` | ✅ | ⛔ |
| `GET /policies` | List policies, optionally filtered by policy type | ✅ | ⛔ |
| `GET /policies/inherited` | Returns all inherited `Policies` for a `Device` or set of `Groups` where the `Device`/`Groups` are associated with all the hierarchies that the `Policy` applies to. Either `deviceId` or `groupPath` must be provided | ✅ | ⛔ |
| `PATCH /policies/{policyId}` | Update the attributes of an existing policy | ✅ | ⛔ |
| `DELETE /policies/{policyId}` | Delete an existing policy | ✅ | ⛔ |
| `GET /policies/{policyId}` | Retrieve a specific policy | ✅ | ⛔ |

### Search

| Endpoint | Description | `full` mode | `lite` mode |
|---|---|---|---|
| `GET /search` | Search for groups and devices | ✅ | ✅ |


## Supported Functionality by Area

The following table describes the differences in functionality between the `full` and `lite` modes by area:

### Devices

| Description | `full` mode | `lite` mode |
|---|---|---|
| Attributes | Unlimited attributes managed via a template, supporting string, number, and boolean types.  Key and value unlimited length. | No templates, maximum 50, string types only.  Maximum 128 characters key, and maximum 800 characters value |
| Values | No limits | Alphanumeric characters plus `_.,@/:#-` allowed only (no spaces) |
| Required attributes | Supported | Not supported |
| Device components | Supported | Not supported |
| Defining relationship names for linked groups | Supported | Not supported |
| Linking devices to other devices | Supported | Not supported |

### Device Templates

| Description | `full` mode | `lite` mode |
|---|---|---|
| Attributes | Unlimited attributes, supporting string, number, and boolean types.  Key and bvalue unlimited length. | Maximum 3 attribtues per Thing Type |
| Updating device templates | Supported | Not supported |
| Required attributes | Supported | Not supported |
| Defining allowed relations to groups | Supported | Not supported |
| Defining allowed relations to devices | Supported | Not supported |

### Groups

| Description | `full` mode | `lite` mode |
|---|---|---|
| Membership | Devices can belong to unlimited groups | Devices can belong to a maximum of 10 groups, and cannot be added to more than 1 group within the same hierarchy |
| Members | No limits | A group may not contain ore than 100 direct child groups |
| Hierarchy depth | Unlimited | Maximum 7 |
| Attributes | Unlimited attributes managed via a template, supporting string, number, and boolean types.  Key and value unlimited length. | No templates, maximum 50, string types only.  Maximum 128 characters key, and maximum 800 characters value |
| Values | No limits | Alphanumeric characters plus `_.,@/:#-` allowed only (no spaces) |
| Required attributes | Supported | Not supported |
| Defining relationship names for linked groups | Supported | Not supported |

### Group Templates

Not supported in `lite` mode.

### Policies

Not supported in `lite` mode.

### Device Profiles

Not supported in `lite` mode.

### Group Profiles

Not supported in `lite` mode.

### Search

| Description | `full` mode | `lite` mode |
|---|---|---|
| No. query terms | Maximum 2048 characters | Maximum 2048 characters, and maximum 5 query terms per query |
| No. results | Unlimited | Maximm 500 per query |
| Aggregation | Supported | Not supported |
| Searching by group ancestors | Supported | Supports filtering by direct linked groups only |
