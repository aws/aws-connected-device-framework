# CDF ASSET LIBRARY OVERVIEW

## Introduction

The Asset Library service is a device registry that allows one to manage their fleet of devices placed within multiple hierarchical groups.  Each group within a hierarchy can represent something meaningful to your business such as location, device types, firmware versions, etc.

## Architecture

The following represents the architecture of the Asset Library, along with its optional sibling service the [Asset Library History](../../assetlibraryhistory/docs/README.md) service.

![Architecture](<docs/images/cdf-core-hla-Asset%20Library.png>)

## Groups

The hierarchies within Asset Library are represented as Groups.  Each Group has exactly one parent, but can comprise of many groups and/or devices as its children.

Each Group has the following fixed attributes:

- `groupPath` : a unique identifier of a group, including all its parent groups within the hierarchy (defined implicitly by `parentPath` and `name`)
- `templateId` : a schema that defines the allowed properties and relations for the group
- `name` : the name of the group (used along with the `parentPath` to define the `groupPath`)
- `parentPath` : the path of the group's immediate parent
- `description` : a description of the group

Groups can be related to other groups via their `relations` attribute, which includes the type of the relationship along with an array of linked group paths.

Different Group Templates can be created to align with ones business, with each Group Template augmenting the above list of fixed attributes with its own attributes, as well as specifiying which group to group and group to device relations are allowed.  An example Group Template could be a `Site`, with its `address` being an attribute, and a `located_at` relationship to a Group Template representing a physical location as follows:

```json
{
    "name": "Site",
    "properties": {
        "address": {"type": "string"}
    },
    "relations": {
        "out": {
            "located_at": [
                "Location"
            ]
        }
    },
    "required": ["address"]
}
```

For more information regarding configuring templates, refer to [Templates](docs/templates-user.md).

#### Sample Group Template

The following sample represents the template for the group `MyCustomGroup`, which comprises of 2 attribute:  `color` (required) and `size` (optional), and an allowed relation to the `MyOtherGroup` group.

```json
{
    "name": "mycustomgroup",
    "properties": {
        "color": {"type": "string"},
        "size": {"type": "number"}
    },
    "relations": {
        "out": {
            "located_at": [
                "myothergroup"
            ]
        }
    },
    "required": ["color"]
}
```

#### Sample Group

The following sample represents an instance of a Group of the above template `MyCustomGroup`:

```json
{
    "templateId": "mycustomgroup",
    "parentPath": "/parent1",
    "name": "group1",
    "description": "My custom group",

    "groups": {
        "located_at": ["/anotherhierarchy/group2"]
    },
    
    "attributes": {
        "color": "Black",
        "size": 3
    }
}
```

## Devices

Likewise, Device Templates can be created to represent the different types of devices within your fleet, each with their own attributes.

Devices can be associated with any number of groups via their Template definitions.

Device can also be associated with other devices, either by specfying a device as a component of another device, or defining a custom relationship between devices via its template.  A device component cannot exist in isolation.

A Device Template has the same format as a Group Template with the addition of a `components` attribute.

Each Device has the following fixed attributes:  `deviceId`, `templateId`, `description`, `awsIotThingArn`, `imageUrl`, `connected` and `state`.

For more information regarding configuring templates, refer to [Templates](docs/templates-user.md).

#### Sample Device Template

The following sample represents the template for the device `Sensor`, which comprises of 2 attribute:  `firmware` (required) and `version` (number), with an allowed relation to the `MyCustomGroup` group.

```json
{
    "name": "sensor",
    "properties": {
        "firmware": {"type": "string"},
        "version": {"type": "number"}
    },
    "relations": {
        "out": {
            "installed_at": [
                "mycustomgroup"
            ]
        }
    },
    "required": ["firmware"]
}
```

#### Sample Device

The following sample represents an instance of a Device of the above template `Sensor`:

```json
{
    "deviceId": "sensor001",
    "templateId": "sensor",
    "groups": {
        "installed_at": ["/parent1/group1"]
    },
    "attributes": {
        "firmware": "F001",
        "version": 341
    }
}
```

## Policies

A Policy represents an object that can be associated with any number of hierarchies, and is then inherited by devices that are also associated with all the same hierarchies that the policy applies to.  An example of policies could be around definining how to provision a device by specifying which provisioning templates to use as follows:

#### Scenario 1

A hierarchy represents a location.  A default permissive policy is applied to group `/location` with a more restrictive policy applied to `/location/china`.

Groups:

- `/location/usa/colorado/denver/factory1`
- `/location/china/northern/beijing/factory2`

Policies:

- `policy_permissive` associated with `/location`
- `policy_restrictive` associated with `/location/china`

Devices:

- `device001` associated with group `/location/usa/colorado/denver/factory1`
- `device002` associated with group `/location/china/northern/beijing/factory2`

In the example above, retrieving the list of policies for `device001` would return `policy_permissive`, whereas retrieiving the policy list for `device002` will be the chain `policy_restrictive` then `policy_permissive`, with the consuming application containing the business logic for which policy to use (e.g. use `policy_permissive` as that's associated with the lowest level group `/location/china`).

#### Scenario 2

Hierarchies represent location and supplier.  A default permissive policy is applied to group `/location` and `/supplier` with a more restrictive policies applied to combinations of `/location/china` and `/supplier/supplier2`.

Groups:

- `/location/usa/colorado/denver`
- `/location/china/northern/beijing`
- `/supplier/supplier1`
- `/supplier/supplier2`

Policies:

- `policy_permissive` associated with `/location`
- `policy_restrictive` associated with `/location/china` and `/supplier/supplier2`

Devices:

- `device001` associated with groups `/location/usa/colorado/denver` and `/supplier/supplier1`
- `device002` associated with groups `/location/china/northern/denver` and `/supplier/supplier2`
- `device003` associated with groups `/location/china/northern/beijing` and `/supplier/supplier1`
- `device004` associated with groups `/location/china/northern/beijing` and `/supplier/supplier2`

In the example above, retrieving the list of policies for `device001`, `device002` and `device003` would return `policy_permissive`, whereas retrieiving the policy list for `device004` will be the chain `policy_restrictive` then `policy_permissive`, with the consuming application containing the business logic for which policy to use.

## Additional Links

- [Application configuration](docs/configuration.md)
- [Events](docs/events.md)
- [Fine-gained access controll](docs/fine-grained-access-control.md)
- [Full vs lite mode](docs/modes.md)
- [Profiles](docs/profiles.md)
- [Swagger](docs/swagger.yml)
- [Templates user guide](docs/templates-user.md)
- [Templates developer guide](docs/templates-developer.md)
