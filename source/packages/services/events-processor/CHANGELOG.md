# Change Log - @cdf/events-processor

This log was last generated on Mon, 21 Mar 2022 21:58:32 GMT and should not be manually modified.

## 4.0.1
Mon, 21 Mar 2022 21:58:32 GMT

### Patches

- Upgrade dependencies marked as deprecated

## 4.0.0
Thu, 17 Feb 2022 09:27:38 GMT

### Breaking changes

- migrate configuration to use dotenv-flow and deployment to use installer

## 3.3.3
Tue, 28 Dec 2021 18:37:09 GMT

### Patches

- Addressed github security dependabot alerts

## 3.3.2
Wed, 08 Dec 2021 21:31:23 GMT

### Patches

- allow users to input eventId
- swagger doc change

## 3.3.1
Tue, 09 Nov 2021 18:18:19 GMT

### Patches

- allow users to input eventId

## 3.3.0
Tue, 28 Sep 2021 22:04:37 GMT

### Minor changes

- 1. add API Gateway Event Sources 2.add Events Notification data via apigateway invoke by curl or by IoT Core & Https rule

### Patches

- Replaced references to CDF components being referred to as services to modules to avoid confusion with AWS services.

## 3.2.1
Wed, 11 Aug 2021 01:26:49 GMT

### Patches

- opensource related minor changes
- Fix, added KMS encryption to SQS qeues

## 3.2.0
Thu, 29 Jul 2021 00:16:37 GMT

### Minor changes

- adding middleware for express based services to remove path from request url to handle custom domain

### Patches

- Added missing permission required to remove lambda invoke permission when deleting an iotcore event source.

## 3.1.4
Wed, 21 Jul 2021 16:46:57 GMT

### Patches

- The generated lambda bundle size has been reduced.

