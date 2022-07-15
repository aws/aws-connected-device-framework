# Change Log - @cdf/installer

This log was last generated on Fri, 15 Jul 2022 15:57:02 GMT and should not be manually modified.

## 1.2.0
Fri, 15 Jul 2022 15:57:02 GMT

### Minor changes

- added installer steps to add cross region support for provisioning with ACMPCA

## 1.1.1
Wed, 13 Jul 2022 23:37:54 GMT

### Patches

- added additional steps for the certificatevendor installer

## 1.1.0
Wed, 13 Jul 2022 02:04:06 GMT

### Minor changes

- add new question to enable/disable events publishing for greengrass2-provisioning module

## 1.0.2
Tue, 05 Jul 2022 04:26:27 GMT

### Patches

- cdf-cli can now be run from any subdirectory

## 1.0.1
Tue, 05 Jul 2022 01:23:08 GMT

### Patches

- correctly export APP_CONFIG in cdf-cli generate-local-config

## 1.0.0
Fri, 01 Jul 2022 21:16:11 GMT

### Breaking changes

-  removed deprecated config-to-env, and cleaned up and renamed cloud-to-env to generate-local-config.

## 0.12.0
Fri, 01 Jul 2022 05:48:17 GMT

### Minor changes

- Updated bulkcert installer to support ACMPCA

## 0.11.0
Thu, 30 Jun 2022 21:32:50 GMT

### Minor changes

- added new cloud-to-env command that given the name of an existing deployed cdf environment will generate the necessary application configuration to run locally.

## 0.10.0
Thu, 30 Jun 2022 00:07:08 GMT

### Minor changes

-  updated ACM PCA integration to support registering certificates using CA's

## 0.9.0
Wed, 29 Jun 2022 00:56:16 GMT

### Minor changes

- update the command function reference for certificate vendor to point to command and control stack

## 0.8.1
Tue, 21 Jun 2022 00:47:55 GMT

### Patches

- update to node 16.x

## 0.8.0
Wed, 15 Jun 2022 16:42:34 GMT

### Minor changes

- make greengrass config generators configurable

## 0.7.2
Wed, 15 Jun 2022 03:43:04 GMT

### Patches

- when creating installer, it will uses pnpm installer by rush

## 0.7.1
Fri, 10 Jun 2022 03:02:06 GMT

### Patches

- fix issues where SNS topic is not being retrieved from the right stack

## 0.7.0
Thu, 02 Jun 2022 00:45:32 GMT

### Minor changes

- Added support for creating and registering AWS IoT device certificates using AWS ACM PCA.

## 0.6.0
Tue, 24 May 2022 04:06:34 GMT

### Minor changes

- introduce package only command

## 0.5.1
Tue, 17 May 2022 00:04:26 GMT

### Patches

- all unhandled rejection will now return exit code 1

## 0.5.0
Mon, 16 May 2022 03:04:28 GMT

### Minor changes

- allow users to specify TTL for DAX query and item cache

## 0.4.3
Fri, 13 May 2022 01:29:37 GMT

### Patches

- minor bug fix, to fix issue where installer would fail due to empty answers

## 0.4.2
Thu, 12 May 2022 21:12:39 GMT

### Patches

- minor updates for device-patcher deployment

## 0.4.1
Thu, 12 May 2022 03:51:07 GMT

### Patches

- minor bug fix, to fix issue where installer would fail due to empty answers

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

