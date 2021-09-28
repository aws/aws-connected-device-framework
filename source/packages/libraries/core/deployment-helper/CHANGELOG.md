# Change Log - @cdf/deployment-helper

This log was last generated on Tue, 28 Sep 2021 22:04:37 GMT and should not be manually modified.

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

