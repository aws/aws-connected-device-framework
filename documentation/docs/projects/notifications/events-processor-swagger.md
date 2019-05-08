# Connected Device Framework: Notifications
The CDF Notifications umbrella of services receives input from a number of different sources (e.g. IoT Core, DynamoDB Streams, API Gateway), and filters based on a subscriber's notification settings.  Any filtered messages are then sent on to a number of pre-configured targets (e.g. AppSync, SNS, or republished to IoT Core).

The CDF Notifications is comprised of 2 micro-services:  the CDF Events Processor, and the CDF Notification Dispatcher.  


## Version: 1.0.0

### /eventsources

#### POST
##### Summary:

Creates a new EventSource

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 |  |
| 400 |  |

#### GET
##### Summary:

Returns all configured event sources

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

### /eventsources/{eventSourceId}

#### GET
##### Summary:

Returns a single event source

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventSourceId](#eventsourceid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

#### DELETE
##### Summary:

Deletes an event source

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventSourceId](#eventsourceid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 |  |
| 404 |  |

### /eventsources/{eventSourceId}/events

#### POST
##### Summary:

Creates a new Event

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventSourceId](#eventsourceid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 |  |
| 400 |  |

#### GET
##### Summary:

Lists all events for a specific event source

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventSourceId](#eventsourceid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

### /events/{eventId}

#### GET
##### Summary:

Returns a single event

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventId](#eventid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

#### DELETE
##### Summary:

Deletes an event

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventId](#eventid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 |  |
| 404 |  |

### /events/{eventId}/subscriptions

#### POST
##### Summary:

Creates a new subscription of an event

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventId](#eventid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 201 |  |
| 400 |  |

#### GET
##### Summary:

Lists all subscriptions for the provided event

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [eventId](#eventid) |
|  |  |  | No | [fromSubscriptionId](#fromsubscriptionid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

### /subscriptions/{subscriptionId}

#### GET
##### Summary:

Returns a single subscription

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [subscriptionId](#subscriptionid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |

#### DELETE
##### Summary:

Deletes a subscription

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [subscriptionId](#subscriptionid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 204 |  |
| 404 |  |

### /user/{userId}/subscriptions

#### GET
##### Summary:

Lists all subscriptions for the provided user

##### Parameters

| Name | Located in | Description | Required | Schema |
| ---- | ---------- | ----------- | -------- | ---- |
|  |  |  | No | [userId](#userid) |

##### Responses

| Code | Description |
| ---- | ----------- |
| 200 |  |
| 400 |  |
| 404 |  |
