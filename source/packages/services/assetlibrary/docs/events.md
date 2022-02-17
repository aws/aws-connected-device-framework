# ASSET LIBRARY EVENTS

The asset library publishes messages to configurable MQTT topics on certain events taking place.

## Configuration

By default, the MQTT event topics are configured as follows, but may be overridden per deployment:

```yaml
events:
  groups:
    topic: cdf/assetlibrary/events/groups/{objectId}/{event}
  devices:
    topic: cdf/assetlibrary/events/devices/{objectId}/{event}
  policies:
    topic: cdf/assetlibrary/events/policies/{objectId}/{event}
  groupTemplates:
    topic: cdf/assetlibrary/events/groupTemplates/{objectId}/{event}
  deviceTemplates:
    topic: cdf/assetlibrary/events/deviceTemplates/{objectId}/{event}
```

`{objectId}` represents the unique identifier as follows:

- groups:  `groupPath`
- devices: `deviceId`
- policies: `policyId`
- groupTemplates: `templateId`
- deviceTemplates: `templateId`

## Events

The payload for the MQTT message is as follows:

```json
{
    "objectId": "<groupPath | deviceId | policyId | templateId>",
    "type": "<groups | groupTemplates | devices | deviceTemplates | policies>",
    "event": "<create | modify | delete>",
    "payload": "<refer to specific event below>",
    "attributes": {
        <refer to specific event below>
    }
}
```

## Device Events

The following events are published per device:

Event | Type | Event | Payload | Attributes
---|---|---|---|---
Device created | devices | create | Device | N/A
Device updated | devices | modify | Device (changed attributes) | N/A
Device deleted | devices | delete | Device (pre delete) | N/A
Device attached to group | devices | modify | N/A | {"deviceId":"", "attachedToGroup":"<groupPath\>", "relationship":"<name\>" }
Device detached from group | devices | modify | N/A | {"deviceId":"", "detachedFromGroup":"<groupPath\>", "relationship":"<name\>" }
Device attached to another device | devices | modify | N/A | {"deviceId":"", "attachedToDevice":"<otherDeviceId\>", "relationship":"<name\>" }
Device detached from another device | devices | modify | N/A | {"deviceId":"", "detachedFromDevice":"<otherDeviceId\>", "relationship":"<name\>" }
Device component created | devices | create | Device (the component) | {"deviceId":"<parentDeviceId\>", "componentId":"" }
Device component updated | devices | modify | Device (the component, changed attributes) | {"deviceId":"<parentDeviceId\", "componentId":"" }
Device component deleted | devices | delete | N/A | {"deviceId":"<parentDeviceId\", "componentId":"" }

## Group Events

The following events are published per group:

Event | Type | Event | Payload | Attributes
---|---|---|---|---
Group created | groups | create | Group | N/A
Group updated | groups | modify | Group (changed attributes) | N/A
Group deleted | groups | delete | Group (pre delete) | N/A

## Policy Events

The following events are published per policy:

Event | Type | Event | Payload | Attributes
---|---|---|---|---
Policy created | policies | create | Policy | N/A
Policy updated | policies | modify | Policy (changed attributes) | N/A
Policy deleted | policies | delete | Policy (pre delete) | N/A

## Device Template Events

The following events are published per device template:

Event | Type | Event | Payload | Attributes
---|---|---|---|---
Device Template created | deviceTemplates | create | Template | N/A
Device Template updated | deviceTemplates | modify | Template (changed attributes) | N/A
Device Template published | deviceTemplates | modify | N/A | { "status":"published" }
Device Template deleted | deviceTemplates | delete | Template (pre-delete) | N/A

## Group Template Events

The following events are published per group template:

Event | Type | Event | Payload | Attributes
---|---|---|---|---
Group Template created | groupTemplates | create | Template | N/A
Group Template updated | groupTemplates | modify | Template (changed attributes) | N/A
Group Template published | groupTemplates | modify | N/A | { "status":"published" }
Group Template deleted | groupTemplates | delete | Template (pre-delete) | N/A
