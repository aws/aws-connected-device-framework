# ASSET LIBRARY: Templates (User)

## Introduction

All groups and devices created within the Asset Library must confirm to a template. A template represents a custom group or device type, with a schema that defines the attributes it may contain, along with the allowed relations a group or device may have between each other.

In addition, a device can be classified as a component which is a special type of device that can only exist when it is part of a larger device assembly. A real world example could be a robotic arm that is represented as a Thing in AWS IoT, which itself is comprised of multiple sensors that are also represented as individual Things within AWS IoT.

## Lifecycle

When creating a new template for the first time, the template will have a status of `draft`. Only when the template is published (its status becomes `published`) will the template be available for use.

When updating an existing template, the `draft` version will be updated if one exists. If not, a new `draft` version is created. It is not possible to update `published` schemas. Instead, `draft` versions must be published in order to release changes.

## Group Templates

Group templates are defined using the following endpoints:

| Endpoint                                                         | Description                                                |
| ---------------------------------------------------------------- | ---------------------------------------------------------- |
| `POST /templates/group/{templateId}`                             | Creates a new group template                               |
| `PATCH /templates/group/{templateId}`                            | Updates an existing group template                         |
| `PUT /templates/group/{templateId}/publish`                      | Publishes a draft group template, making the template live |
| `GET /templates/group?status={draft\|published}`                 | Returns a list of all group templates for the given status |
| `GET /templates/group/{templateId}?status={draft\|published}`    | Returns a specific version of a specific group template    |
| `DELETE /templates/group/{templateId}?status={draft\|published}` | Deletes a specific version of a specific group template    |

All group templates automatically inherit the following attributes:

- `groupPath` : a unique identifier of a group, including all its parent groups within the hierarchy
- `templateId` : a schema that defines the allowed properties and relations for the group
- `name` : the name of the group (used along with the `parentPath` to define the `groupPath`
- `parentPath` : the path of the group's immediate parent
- `description` : a description of the group

An example to define a custom group template `site` with a single required attribute `address` of type `string` is as follows:

```json
POST /templates/group/site

{
    "properties": {
        "address": {"type": "string"}
    },
    "required": ["address"]
}
```

When viewing/creating/updating a group, any custom properties defined for the template are accessible beneath the `attributes` key. The example given above for adding `address` as a property would be represented as the following:

```json
{
  "templateId": "site",
  "parentPath": "/location",
  "name": "Manufacturing",

  "attributes": {
    "address": "123 Somewhere Street"
  }
}
```

## Device Templates

Group templates are defined using the following endpoints:

| Endpoint                                                          | Description                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------- |
| `POST /templates/device/{templateId}`                             | Creates a new device template                               |
| `PATCH /templates/device/{templateId}`                            | Updates an existing device template                         |
| `PUT /templates/device/{templateId}/publish`                      | Publishes a draft device template, making the template live |
| `GET /templates/device?status={draft\|published}`                 | Returns a list of all device templates for the given status |
| `GET /templates/device/{templateId}?status={draft\|published}`    | Returns a specific version of a specific device template    |
| `DELETE /templates/device/{templateId}?status={draft\|published}` | Deletes a specific version of a specific device template    |

All device templates automatically inherit the following attributes:

- `deviceId` : a unique identifier for the device
- `templateId` : a schema that defines the allowed properties and relations for the device
- `name` : the name of the device
- `description` : a description of the device
- `imageUrl` : URL of an image representation of the device
- `awsIotThingArn` : The Thing Arn representing the device, if registered within AWS IoT
- `status` : lifecycle status

In addition, the allowed relations between the device and group, along with types of components, may be defined for a device.

The following example describes how to create the device template `mote` with two attributes (one mandatory), is allowed to be associated with the group template `site` by means of the relationship `located_at`, and allows for components to be added of the template `sensor`:

```json
POST /templates/device/mote

{
    "properties": {
        "length": {"type": "number"},
        "width": {"type": "number"}
    },
    "required": ["length"],
    "relations": {
        "out": {
            "located_at": ["site"]
        }
    },
    "components": ["sensor"]
}
```

When viewing/creating/updating a device, any custom properties defined for the template are accessible beneath the `attributes` key. The example given above for defining a template would be represented as the following:

```json
{
  "groups": {
    "located_at": "/location/manufacturing"
  },
  "attributes": {
    "length": 112,
    "width": 22
  },
  "category": "device",
  "templateId": "myCustomDeviceType",
  "deviceId": "device-001",
  "components": []
}
```

## Defining Properties

Both device and group templates support defining `properties`, which represents a list of fields along with a type. These properties are defined in the style of `JSON Schema draft-07`.

Types may be defined as `integer`, `number`, `string` or `boolean`.

The following represents the supported keywords for the different types:

### number / integer keywords

A `number` represents a JSON style 64-bit double precision floating point number, following the international IEEE 754 standard.

An `integer` represents a whole number.

When defining a type as a `number` or `integer`, the following additional keywords are supported:

| Keyword            | Description                                              |
| ------------------ | -------------------------------------------------------- |
| `minimum`          | The minimum allowed value, including this defined value. |
| `exclusiveMinimum` | The minimum allowed value, excluding this defined value. |
| `maximum`          | The maximum allowed value, including this defined value. |
| `exclusiveMaximum` | The maximum allowed value, excluding this defined value. |
| `multipleOf`       | A valid value must be a multiple of this value.          |

Examples:

```json
{
  "properties": {
    "height": {
      "type": "integer",
      "minimum": 5,
      "maximum": 50,
      "multipleOf": 5
    }
  }
}
```

### string keywords

When defining a type as a `string`, the following additional keywords are supported:

| Keyword     | Description                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| `maxLength` | Maximum allowed length                                                                                         |
| `minLength` | Minimum allowed length                                                                                         |
| `pattern`   | A regular experssion to validate the value                                                                     |
| `format`    | A pre-defined format. Supported formats are `date`, `date-time`, `uri`, `email`, `hostname`, `ipv4` and `ipv6` |

Examples:

```json
{
  "properties": {
    "code": {
      "type": "string",
      "minLength": 5,
      "maxLength": 20
    },
    "payloadFormat": {
      "type": "string",
      "pattern": "[abc]+"
    },
    "installedDate": {
      "type": "string",
      "format": "date"
    }
  }
}
```

### keywords common to all types

The following keywords are supported by all types:

| Keyword | Description                            |
| ------- | -------------------------------------- |
| `enum`  | A list of allowed values (of any type) |

Examples:

```json
{
  "properties": {
    "color": {
      "type": "string",
      "enum": ["red", "amber", "green"]
    }
  }
}
```

### Compound keywords

The following keywords can be used together with other keywords to define more complex constraints:

| Keyword | Description                                                                         |
| ------- | ----------------------------------------------------------------------------------- |
| `not`   | The data is valid if it is invalid according to this keyword                        |
| `oneOf` | The data is valid if it matches exactly one of the schemas as defined by this array |
| `anyOf` | The data is valid if it matches one or more of the schemas as defined by this array |
| `allOf` | The data is valid if it matches all of the schemas as defined by this array         |

Examples:

```json
{
  "properties": {
    "errorCode": {
      "not": {
        "type": "string"
      }
    },
    "pcmCode": {
      "oneOf": [{ "maximum": 10 }, { "type": "integer" }]
    },
    "pcmAction": {
      "anyOf": [{ "minimum": 1000 }, { "type": "integer" }]
    },
    "timeInterval": {
      "allOf": [{ "minimum": 1000 }, { "type": "integer" }]
    }
  }
}
```

## Defining relations

Devices may be associated with one or more groups. These associations are created by defining the relationship type and target group type as part of the device template.

As an example, the following device template for a custom `mote` type will allow this type of device to be associated with the `site` template via the `located_at` relationship:

```json
{
  "properties": {
    "code": { "type": "string" }
  },
  "relations": {
    "out": {
      "located_at": ["site"]
    }
  }
}
```

Once a relationship has been defined on a device template, it will also be visible when viewing the corresponding group template. To follow the same example, the template for the custom `site` group will be returned as follows:

```json
{
  "properties": {
    "address": { "type": "string" }
  },
  "relations": {
    "in": {
      "located_at": ["mote"]
    }
  }
}
```

Once the relationship has been defined, the following endpoints may be utilized to create the relationships between different instances of those types:

| Endpoint                                                     | Description                                                |
| ------------------------------------------------------------ | ---------------------------------------------------------- |
| PUT /devices/{deviceId}/{relationship}/groups/{groupPath}    | Associates a device to a group via a specific relationship |
| DELETE /devices/{deviceId}/{relationship}/groups/{groupPath} | Removes a specific association between a device and group  |

## Defining Components

Devices may contain other devices represented as components. Components are a special classification of a device in which components cannot exist by themselves. They must form part of an assembly which is represented as a parent device.

To allow a device to contain components, the type must be specified in the device template. As an example, the following device template will allow components to be added of the `sensor` device template:

```json
{
  "properties": {
    "code": { "type": "string" }
  },
  "components": ["sensor"]
}
```

Once a component has been defined, the following endpoints may be used to manage components:

| Endpoint                                                 | Description                                                                                                                                                                                              |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /devices`                                          | When creating a new device, if the `components` attribute has been provided in the body (representing a list of devices), each of these components will be created and associated with the parent device |
| `GET /devices/{deviceId}?expandComponents={true\|false}` | If `expandComponents` is true, all components associated with the device will be returned                                                                                                                |
| `POST /devices/{deviceId}/components`                    | Adds a new component to an existing device                                                                                                                                                               |
| `PATCH /devices/{deviceId}/components/{componentId}`     | Updates an existing component of an existing device                                                                                                                                                      |
| `DELETE /devices/{deviceId}/components/{componentId}`    | Deletes an existing component of an existing device                                                                                                                                                      |
