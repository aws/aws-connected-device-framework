# Change Log - @cdf/assetlibrary-client

This log was last generated on Mon, 11 Jul 2022 22:20:13 GMT and should not be manually modified.

## 5.1.0
Mon, 11 Jul 2022 22:20:13 GMT

### Minor changes

- Added new methods to deassociate all devices and groups from a device.

## 5.0.5
Tue, 21 Jun 2022 00:47:55 GMT

### Patches

- update to node 16.x

## 5.0.4
Thu, 07 Apr 2022 05:00:50 GMT

### Patches

- fix parsing of ASSETLIBRARY_HEADERS config setting

## 5.0.3
Tue, 22 Mar 2022 22:51:44 GMT

### Patches

- print module name when outputting loaded config on startup

## 5.0.2
Mon, 21 Mar 2022 21:58:32 GMT

### Patches

- Upgrade dependencies marked as deprecated

## 5.0.1
Thu, 10 Mar 2022 00:08:34 GMT

### Patches

- the template model lists an enum parameter, which should be a string[] listing the enum values instead of just a string
- correct typo in assetlibrary client

## 5.0.0
Thu, 17 Feb 2022 09:27:38 GMT

### Breaking changes

- migrate configuration to use dotenv-flow and deployment to use installer

## 4.2.3
Fri, 28 Jan 2022 02:31:34 GMT

### Patches

- the template model lists an enum parameter, which should be a string[] listing the enum values instead of just a string
- assetlibrary-client now includes facetField param in search request

## 4.2.2
Tue, 04 Jan 2022 23:16:00 GMT

### Patches

- getPolicy lambda invoke should use policyId

## 4.2.1
Tue, 28 Dec 2021 18:37:09 GMT

### Patches

- Addressed github security dependabot alerts

## 4.2.0
Wed, 08 Dec 2021 21:31:23 GMT

### Minor changes

- added includeGroups query param to getGroup function calls

## 4.1.2
Tue, 28 Sep 2021 22:04:37 GMT

### Patches

- Replaced references to CDF components being referred to as services to modules to avoid confusion with AWS services.

## 4.1.1
Wed, 11 Aug 2021 01:26:49 GMT

### Patches

- opensource related minor changes

## 4.1.0
Fri, 23 Jul 2021 16:14:32 GMT

### Minor changes

- Return the groupPath of new groups at time of creation as a header.

## 4.0.2
Wed, 21 Jul 2021 16:46:57 GMT

_Initial release_

