# Change Log - @awssolutions/cdf-deployment-helper

This log was last generated on Mon, 20 May 2024 19:16:22 GMT and should not be manually modified.

## 2.6.0
Mon, 20 May 2024 19:16:22 GMT

_Version update only_

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
Thu, 16 Feb 2023 18:41:01 GMT

### Breaking changes

- Required Neptune engine version is now 1.2.0.0.R2 or greater.

## 3.3.0
Fri, 29 Jul 2022 02:59:14 GMT

### Minor changes

- add the custom resource to publish stack events to eventbridge

## 3.2.0
Wed, 29 Jun 2022 00:56:16 GMT

### Minor changes

- deployment-helper is using command and control client to invoke the module

## 3.1.1
Tue, 21 Jun 2022 00:47:55 GMT

### Patches

- update to node 16.x

## 3.1.0
Wed, 27 Apr 2022 06:44:55 GMT

### Minor changes

- should pass claim when calling asset library (for auth mode)

## 3.0.1
Mon, 21 Mar 2022 21:58:32 GMT

### Patches

- Upgrade dependencies marked as deprecated

## 3.0.0
Thu, 17 Feb 2022 09:27:38 GMT

### Breaking changes

- migrate configuration to use dotenv-flow and deployment to use installer

## 2.0.5
Tue, 28 Dec 2021 18:37:09 GMT

### Patches

- Addressed github security dependabot alerts

## 2.0.4
Wed, 08 Dec 2021 21:31:23 GMT

### Patches

- deployment helper for Events and EventSource 
- fixed lint issue let -> const

## 2.0.3
Wed, 08 Dec 2021 17:48:56 GMT

### Patches

- deployment helper for Events and EventSource 

## 2.0.1
Tue, 28 Sep 2021 22:04:37 GMT

### Patches

- Replaced references to CDF components being referred to as services to modules to avoid confusion with AWS services.

## 2.0.0
Wed, 11 Aug 2021 01:26:49 GMT

### Breaking changes

- new service added

### Minor changes

- add logic for thing group custom resource lambda to check if thing group had been created manually in the past (and do nothing)

### Patches

- wire up the RotateCertificatesJobCustomResource to inversify and fix the custom resource logic

## 2.0.2
Wed, 21 Jul 2021 16:46:57 GMT

### Patches

- The generated lambda bundle size has been reduced.

