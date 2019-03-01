# RELEASE NOTES

## v1.2.1

- UPDATE:  Updated @cdf dependencies

## v1.2.0

- FIX:  Component attributes were not validated at component create/update
- NEW:  Added device profiles which allows for managing multiple sets of default attributes/relations per devices and/or groups, and the ability to apply them at time of device/group create/update
- FIX:  Bulk update devices was returning a 201 insatead of 204 as success

## v1.1.0

- UPDATE:  Added stack policy to prevent accidental deletion of Neptune database.
- UPDATE:  Updated depedency version of @cdf/config-inject.
- UPDATE:  Changed default MQTT event topics.
- FIX:  Policy partial updates were replacing existing policies completely.  Now true partial updates.
- FIX:  Validation when creating/updating device relationships to existing groups was not validating that the template of the group was an allowed relation type.
- UPDATE:  `GET /devices/{deviceId}` supports optionally returning a subset of attributes via the `?attributes` parameter (return all by default), and optionally excluding returning related groups via `?includeGroups` (true by default).
- NEW:  `GET /bulkdevices?deviceIds` to return a list of devices. Supports optionally returning a subset of attributes via the `?attributes` parameter (return all by default), and optionally excluding returning related groups via `?includeGroups` (true by default).

## v1.0.7

- NEW:  Added `GET /search` endpoint to search across all groups and/or templates.
- BREAKING:  `GET /devices/search` and `GET /groups/search` endpoints have been replaced by `GET /search`.  Use the `?type` parameter to filter on type(s).
- UPDATE:  Modified published events to include category.
- UPDATE:  Refactoring of handling case sensitivity of ID's so that correct casing is broadcasted as part of published event.
- 