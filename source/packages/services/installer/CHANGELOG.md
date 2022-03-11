# Change Log - @cdf/installer

This log was last generated on Thu, 10 Mar 2022 00:24:53 GMT and should not be manually modified.

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

