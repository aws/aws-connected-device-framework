# ASSET LIBRARY HISTORY OVERVIEW

## Introduction

The Asset Library History service is an optional service that stores all changes made to Asset Library resources (devices, groups, policies and/or templates).

## Architecture

The following represents the architecture of the Asset Library History, along with required the [Asset Library](../assetlibrary/README.md) service.

![Architecture](<../assetlibrary/docs/images/cdf-core-hla-Asset%20Library.png>)

## Subscribing to Events

The Asset Library broadcasts [events](../assetlibrary/docs/events.md) which the Asset Library subcribes to.  Upon receiving, the event is stored in its datastore for later retrieval.

## REST API

The following endpoints are exposed:

Endpoint | Description
---|---
`GET /{type}/{objectId}?timeAt=&timeFrom=&timeTo=&user=&event=&sort=&token=&limit=` | Returns the events for a specific object.
`GET /{type}?timeFrom=&timeTo=&user=&event=&sort=&token=&limit=` | Returns all configuration changes of a specific object type.

- `{type}` represents the type of resource:  `devices`, `groups`, `deviceTemplates`, `groupTemplates` or `policies`.
- `{objectId}` represents the unique identifier for the type of object, e.g. `deviceId` for devices, or `groupPath` for groups.
- `?timeAt` represents the state as at a specific time.
- `?timeFrom` and `?timeTo` represent a date/time range.
- `?user` represents the author of changes.
- `?event` represents the evet type, one of `create`, `modify` or `delete`.
- `?sort` represents a sort order, e.g. `?sort=time::asc`.
- `?token` and `?limit` allow for paginating.

### Example endpoint usage:

#### Returning the configuration for device *device001* as of *05/01/2018*

```sh
GET /devices/device001?timeAt=2018-05-01T00:00:00+00:00
```

```json
{
	"events": [{
		"time": "2018-02-21T03:45:05+00:00",
		"author": "deanhart",
		"eventType": "modify",

		"device": {
			<device>
		}
	}]
}
```

#### Returning the latest known event for device *device001*:

```sh
GET /devices/device001
```

```json
{
	"events": [{
		"time": "2018-02-21T03:45:05+00:00",
		"author": "deanhart",
		"eventType": "modify",

		"device": {
			<device>
		}
	}]
}
```

#### Returning all configuration changes for the group */supplier/sup123* since *02/01/2018*

```sh
GET /groups/%2fsupplier%2fsup123?timeFrom=2018-05-01T00:00:00+00:00&sort=time::desc
```

```json
{
	"events": [{
		"time": "2018-06-21T03:45:05+00:00",
		"author": "deanhart",
		"eventType": "modify",
	
		"group": {
			<group>
		}
	}, {
		"time": "2018-05-20T00:15:00+00:00",
		"author": "deanhart",
		"eventType": "modify",
	
		"group": {
			<group>
		}
	}],

	"pagination": {
		"token": "a1b2c3d4e5f6"
	}
}
```

#### Determining when a specific device was deleted

```sh
GET /devices/device123?event=delete
```

```json
{
	"events": [{
		"time": "2018-06-21T03:45:05+00:00",
		"author": "deanhart",
		"eventType": "delete",
	
		"device": {
			<device>
		}
	}]
}
```

#### Returning all configuration changes of *devices* between *03/15/2018* and *04/15/2018* performed by *deanhart*, limiting the result size returned

```sh
GET /devices?timeFrom=2018-03-15T00:00:00+00:00&timeTo=2018-04-15T00:00:00+00:00&user=deanhart&sort=time::desc&limit=2
```

```json
{
	"events": [{
		"updatedAt": "2018-03-21T03:45:05+00:00",
		"updatedBy": "deanhart",
		"eventType": "modify",
	
		"group": {
			<group>
		}
	}, {
		"updatedAt": "2018-03-20T00:15:00+00:00",
		"updatedBy": "deanhart",
		"eventType": "modify",
	
		"group": {
			<group>
		}
	}],

	"pagination": {
		"token": "a1b2c3d4e5f6"
	}
}
```

## Datastore

DynamoDB is the datastore serving the Asset Library History service.  A single DynamoDB table exists as follows:

Primary Key:

- Partition key:  `{objectId}`
- Sort key:  `latest` | `{time}`

Attributes:

- `type`: string  (devices | groups | policies | deviceTemplates | groupTemplates)
- `time`: string  (ISO-8601 UTC date formatted as a string)
- `event`: string  (create | modify | delete)
- `user`: string
- `state`: string  (full json snapshot of the domain object, such as a `device`)

GSI:

- Partition key:  `{type}`
- Sort key:  `{time}`

The above partition/sort keys allow for the following queries to be made:

- Returning the configuration for device *device001* as of *05/01/2018*:

```sh
--table-name <tableName> \
--key-condition-expression "objectId = :deviceId AND time BETWEEN :from AND :to" \
--expression-attribute-values  '{":deviceId":{"S":"device001"}, ":from":{"S":"2018-05-01T00:00:00+00:00"}, ":to":{"S":"2018-05-01T23:59:59+00:00"}}'
```

- Returning the latest known event for device *device001*:

```sh
--table-name <tableName> \
--key-condition-expression "objectId = :deviceId AND time = :version" \
--expression-attribute-values  '{":deviceId":{"S":"device001"}, ":version":{"S":"latest"}}'
```

- Returning all configuration changes for the group */supplier/sup123* since *02/01/2018*:

```sh
--table-name <tableName> \
--key-condition-expression "objectId = :groupPath AND time >= :time" \
--expression-attribute-values  '{":groupPath":{"S":"/supplier/sup123"}, ":time":{"S":"2018-02-01"}}'
```

- Determining when a specific device was deleted:

```sh
--table-name <tableName> \
--key-condition-expression "objectId = :deviceId" \
--filter-expression "#e = :event" \
--expression-attribute-names '{"#e": "event"}' \
--expression-attribute-values  '{":deviceId":{"S":"device001"}, ":event":{"S":"delete"}}'
```

- Returning all configuration changes of *devices* between *03/15/2018* and *04/15/2018* performed by *deanhart*:

```sh
--table-name <tableName> \
--index-name <gsi-name> \
--key-condition-expression "type = :type AND time BETWEEN :from AND :to" \
--filter-expression "#a = :author" \
--expression-attribute-names '{"#a": "author"}' \
--expression-attribute-values  '{":type":{"S":"devices"}, ":from":{"S":"2018-05-01T00:00:00+00:00"}, ":to":{"S":"2018-05-01T23:59:59+00:00"}, ":author":{"S":"deanhart"}}'
```

## Taking Action on Events

The Asset Library History service subcribes to the Asset Library published [events](../assetlibrary/docs/events.md) via an AWS Iot Rule.  The action taken for each event is as follows:

Note: the `saved` action below involves writing both a new event item with timestamp set appropriately, along with replicating the item to the `latest` item.

Event | Actions
---|---
Device created | Saved
Device updated | Latest version retrieved, changed attributes updated, saved
Device deleted | Saved
Device attached to group | Latest version retrieved, groups attribute updated, saved
Device detached from group |  Latest version retrieved, groups attribute updated, saved
Device attached to another device |  Latest version retrieved of both devices affected, changed attributes updated, saved
Device detached from another device | Latest version retrieved of both devices affected, changed attributes updated, saved
Device component created | Component saved.  Latest version of parent retrieved, component list updated, saved
Device component updated | Latest version retrieved, changed attributes updated, saved
Device component deleted | Component saved.  Latest version of parent retrieved, component list updated, saved
Group created | Saved
Group updated | Latest version retrieved, changed attributes updated, saved
Group deleted | Saved
Policy created | Saved
Policy updated | Latest version retrieved, changed attributes updated, saved
Policy deleted | Saved
Device Template created | Saved
Device Template updated | Latest version retrieved, changed attributes updated, saved
Device Template published | Latest version retrieved, changed attributes updated, saved
Device Template deleted | Saved
Group Template created | Saved
Group Template updated | Latest version retrieved, changed attributes updated, saved
Group Template published | Latest version retrieved, changed attributes updated, saved
Group Template deleted | Saved

## Important Links

- [Application configuration](docs/configuration.md)
- [Swagger](docs/swagger.yml)