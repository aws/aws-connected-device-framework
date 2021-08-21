# NOTIFICATIONS: Walkthrough

## Introduction

The following describes how to create an event source, define an event, then subcribe to receive alerts of processed events.

**Note**:  review the [swagger definition](./swagger.yml) for a full list of available endpoints.

## Step 1:  Define an event source.

There are 2 types of event source defined:  DynamoDB, and IoT Core:

**Note**: When defining an event source, ensure no attributes or properties of the source's data attirbutes collides with the CDF internal
properties. The following keywords should be considered as reserved keywords.

**Reserved Keywords**:
"eventSourceId", "principal", "principalValue", "sourceChangeType", "eventId", "eventName", "attributes", "pk", "time", "userId"

If such properties needs to used, they can be prefixed to be differentiated from the reserved keywords list.

### A DynamoDB event source

- `id`: the DynamoDB Table arn
- `name`: a name to identfy the event source
- `sourceType`: must set to `DynamoDB`
- `principal`: the attribute witin the table that uniquely represents the item in context
- `dynamoDb.tableName`: the DynamoDB table name

#### Request
```
POST /eventsources
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
{
	"id": "arn:aws:dynamodb:us-west-2:123456789012:table/Telemetry",
	"name": "Processed Events",
    "sourceType": "DynamoDB",
    "principal": "thingName",
    "dynamoDb": {
    	"tableName": "Telemetry"
    }
}
```

#### Response
`204 No Content`

### An IOT Core event source

- `name`: a name to identfy the event source
- `sourceType`: must set to `IoTCore`
- `principal`: the attribute witin the table that uniquely represents the item in context
- `iotCore.mqttTopic`: the MQTT topic to subscribe to
- `iotCore.attributes`: A mapping of attributes from the incoming event to transform to the common event format.  In the example below, the incoming attribue `bl` will be transformed to `attributes.batteryLevel`, and `sensor.1.value` will be transformed to `attributes.temperature`.


#### Request
```
POST /eventsources
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
{
	"name": "Raw Events",
    "sourceType": "IoTCore",
    "principal": "thingName",
    "iotCore": {
    	"mqttTopic": "dean/test",
    	"attributes": {
    		"batteryLevel": "bl",
    		"temperature": "sensor.1.value"
    	}
    }
}
```

#### Response
`204 No Content`

## Step 2:  View the available event sources

#### Request
```
GET /eventsources
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
```

#### Response
```
{
    "results": [
        {
            "id": "arn:aws:dynamodb:us-west-2:xxxxxxxxxx:table/Telemetry",
            "name": "Processed Events"
        }
    ]
}
```

## Step 3:  Define an event

- `name`: a name to identify the event
- `conditions`: the example below evalutes the `batteryLevel` attribute of the incoming common event format message, and raises an alert if its value is less then or equals to a value that will be provided at the time of creating the subscription (represented by the $bl parameter)
- `supportedTargets`: the example below supported 2 targets: email and sms.  Email will use the default template, and sms using the small template
- `templates`: a definition of the templates (written in VTL) that are referenced by the supported targets


#### Request
```
POST /eventsources/arn%3Aaws%3Adynamodb%3Aus-west-2%3AXXXXXXXXXX%3Atable%2FTelemetry/events
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
{
    "name": "Battery alert",
    "conditions": {
    	"all": [{
    		"fact": "batteryLevel",
    		"operator": "lessThanInclusive",
    		"value": "$bl"
    	}]
    },
	"supportedTargets": {
		"email": "default",
		"sms": "small"
	},
    "templates": {
    	"default": "The battery for bowl {{=it.principalValue}} is low.",
    	"small": "{{=it.principalValue}} battery low"
	}
}
```

#### Response
`204 No Content`

## Step 4:  View the available events for an event source

#### Request
```
GET /eventsources/arn%3Aaws%3Adynamodb%3Aus-west-2%3AXXXXXXXXXX%3Atable%2FdeansTest/events
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
```

#### Response
```
{
    "results": [
        {
            "eventId": "5fb570e0-71b0-11e9-b534-5d33aa3bde97",
            "eventSourceId": "arn:aws:dynamodb:us-west-2:XXXXXXXXX:table/deansTest",
            "name": "Battery alert",
            "conditions": {
                "all": [
                    {
                        "value": "$bl",
                        "operator": "lessThanInclusive",
                        "fact": "batteryLevel"
                    }
                ]
            },
            "ruleParameters": [
                "bl"
            ],
            "enabled": true,
            "principal": "thingName",
            "templates": {
                "small": "{{=it.principalValue}} battery low",
                "default": "The battery for bowl {{=it.principalValue}} is low."
            },
            "supportedTargets": {
                "sms": "small",
                "email": "default"
            }
        }
    ]
}
```

## Step 5:  Subscribe to an event

- `user.id`: unique ID of the user
- `principalValue`: for an incoming rule to be evaluated for this user, the value of principalValue must represent the value of the principal attribute defined for the event
- `targets`: optionally subscribe to any of the supported targets configured for the event
- `ruleParameterValues`: if the event conditions contain parameters as part of its value, they must be provided when creating the subscription

#### Request
```
POST /events/5fb570e0-71b0-11e9-b534-5d33aa3bde97/subscriptions
Accept: application/vnd.aws-cdf-v2.0+json
Content-Type: application/vnd.aws-cdf-v2.0+json
{
	"user": {
		"id": "user123"
	},
	"principalValue": "device001",
    "targets": {
    	"email": [{
    		"address": "someone@asomewhere.com"
		}],
		"sms": [{
			"phoneNumber": "15551231234"
		}]
	},
	"ruleParameterValues": {
		"bl": 15
	}
}
```


#### Response
`204 No Content`
