# Change Log - @awssolutions/cdf-events-processor

This log was last generated on Mon, 09 Sep 2024 20:07:59 GMT and should not be manually modified.

## 2.6.4
Mon, 09 Sep 2024 20:07:59 GMT

_Version update only_

## 2.6.3
Thu, 30 May 2024 19:52:05 GMT

_Version update only_

## 2.6.2
Wed, 29 May 2024 04:17:38 GMT

_Version update only_

## 2.6.1
Fri, 24 May 2024 15:27:46 GMT

_Version update only_

## 2.6.0
Mon, 20 May 2024 19:16:22 GMT

### Updates

- keep filter from erroring when no events are found, additional cleanup

## 2.5.2
Fri, 27 Oct 2023 18:10:50 GMT

_Version update only_

## 2.5.1
Thu, 26 Oct 2023 21:17:00 GMT

_Version update only_

## 2.5.0
Tue, 24 Oct 2023 15:32:09 GMT

_Version update only_

## 2.4.0
Tue, 15 Aug 2023 18:35:38 GMT

_Version update only_

## 0.0.0
Thu, 09 Mar 2023 22:35:00 GMT

_Version update only_

## 0.2.0
Wed, 08 Mar 2023 01:03:23 GMT

_Version update only_

## 0.1.0
Tue, 07 Mar 2023 23:22:30 GMT

_Version update only_

## 1.1.0
Thu, 16 Feb 2023 18:41:02 GMT

_Version update only_

## 4.2.0
Fri, 29 Jul 2022 02:59:14 GMT

### Minor changes

- export variables required for eventsAlerts as ssm parameters

## 4.1.1
Tue, 21 Jun 2022 00:47:55 GMT

### Patches

- update to node 16.x

## 4.1.0
Mon, 16 May 2022 03:04:28 GMT

### Minor changes

- fix the issue where disable DAX is not working and allow TTL for item and query cache to be set

## 4.0.2
Wed, 27 Apr 2022 08:32:22 GMT

### Patches

- installer will now check valid instance types, cloudformation only check the regex pattern

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

