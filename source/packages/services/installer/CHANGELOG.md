# Change Log - @cdf/installer

This log was last generated on Thu, 12 May 2022 01:58:21 GMT and should not be manually modified.

## 0.4.0
Thu, 12 May 2022 01:58:21 GMT

### Minor changes

- Added the capability to the installer to create/modify supplier CA

## 0.3.4
Thu, 05 May 2022 01:48:19 GMT

### Patches

- fix installer not allowing zero custom tags

## 0.3.3
Wed, 27 Apr 2022 09:56:58 GMT

### Patches

- authJwt is not being considered in topological sort

## 0.3.2
Wed, 27 Apr 2022 08:32:22 GMT

### Patches

- refactoring the prompt works to make sure that optional module questions only being asked when needed

## 0.3.1
Wed, 27 Apr 2022 06:44:55 GMT

### Patches

- remove the packaging of openssl from installer

## 0.3.0
Tue, 26 Apr 2022 03:49:33 GMT

### Minor changes

- tag all CDF resources with two mandatory and arbitrary optional tags

## 0.2.3
Thu, 14 Apr 2022 04:49:09 GMT

### Patches

- docs: remove duplication of calling rush install followed by rush bundle

## 0.2.2
Wed, 13 Apr 2022 15:53:28 GMT

### Patches

- fix installer flow when specifying existing KMS key by ID

## 0.2.1
Fri, 08 Apr 2022 07:03:46 GMT

### Patches

- corrected the naming of command-and-control environment variables

## 0.2.0
Fri, 25 Mar 2022 03:55:57 GMT

### Minor changes

- adding command and control to installer

## 0.1.8
Thu, 17 Mar 2022 21:52:07 GMT

### Patches

- Fixes issue where installer creates new KMS key on every run

## 0.1.7
Thu, 17 Mar 2022 05:13:05 GMT

### Patches

- Fix dependency between apigw.cloudFormationTemplate and apigw.type default value

## 0.1.6
Tue, 15 Mar 2022 18:37:51 GMT

### Patches

- Assetlibrary installer: Display list of available Neptune instance types

## 0.1.5
Thu, 10 Mar 2022 00:24:53 GMT

### Patches

- Parts of the installer were still assuming the installer had been ran from with the installer package dir rather than from within anywhere within the monorepo as supported by cdf-cli.

## 0.1.4
Fri, 18 Feb 2022 17:44:18 GMT

### Patches

- The monorepo root was not correctly identified when installing using the cdf-cli command run from outside the installer module directory.

## 0.1.3
Fri, 18 Feb 2022 03:10:00 GMT

### Patches

- rollback the cdf-openssl stack name to make it backward compatible

## 0.1.2
Thu, 17 Feb 2022 11:16:43 GMT

### Patches

- fix the filename for cfn-assetlibrary-export.yaml

## 0.1.1
Thu, 17 Feb 2022 09:27:38 GMT

_Initial release_

