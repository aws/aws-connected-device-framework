# Change Log - @cdf/certificate-vendor

This log was last generated on Wed, 13 Jul 2022 23:37:54 GMT and should not be manually modified.

## 5.1.0
Wed, 13 Jul 2022 23:37:54 GMT

### Minor changes

- added capability to rotate multiple certs for a particular device and also to inheret policies from the old certificate

## 5.0.3
Tue, 21 Jun 2022 00:47:55 GMT

### Patches

- update to node 16.x

## 5.0.2
Mon, 21 Mar 2022 21:58:32 GMT

### Patches

- Upgrade dependencies marked as deprecated

## 5.0.1
Thu, 10 Mar 2022 00:08:34 GMT

### Patches

- correct typo in assetlibrary client import

## 5.0.0
Thu, 17 Feb 2022 09:27:38 GMT

### Breaking changes

- migrate configuration to use dotenv-flow and deployment to use installer

## 4.1.2
Tue, 28 Dec 2021 18:37:09 GMT

### Patches

- Addressed github security dependabot alerts

## 4.1.1
Tue, 28 Sep 2021 22:04:37 GMT

### Patches

- Replaced references to CDF components being referred to as services to modules to avoid confusion with AWS services.
- Corrected the examples provided in the module overview documentation.

## 4.1.0
Wed, 11 Aug 2021 01:26:49 GMT

### Minor changes

- introduce a new custom resource to create thing group

### Patches

- opensource related minor changes
- move the creation of RotateCertificates template from script to custom resource

## 4.2.0
Thu, 29 Jul 2021 00:16:37 GMT

### Minor changes

- adding middleware for express based services to remove path from request url to handle custom domain

## 4.1.4
Wed, 21 Jul 2021 16:46:57 GMT

### Patches

- The generated lambda bundle size has been reduced.

