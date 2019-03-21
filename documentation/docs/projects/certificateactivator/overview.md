# CERTIFICATE ACTIVATOR

## Introduction

The CDF Certificate Activator service links the Just In Time Registration (JITR) functionality of AWS IoT with the CDF provisioning flow(s). It includes a rule which invokes a Lambda function based on JITR events emitted from AWS IoT.

## Dependencies

- It is assumed that the Asset Library is running in `full` mode which supports profiles, with a profile created for the `templateId` in context
- It is assumed that the Asset Library is running in `full` mode which supports inherited documents, with a provisioning template configured and associated with group hierarcies as required
- It is assumed that the provisioning template requires `ThingName` and `CertificateId` as parameters

## Limitations

Known limitations which may require customizing the implementation:

- The `templateId` and `deviceId` are stored as `${templateId}::{deviceId}` within the certificate's CN (common name) field, which according to RFC5280 is limited to 64 characters.  If the combination of those 2 attributes exceeds the known limit, an alternate method would be required (such as linking to an alternate data store) to store these values
