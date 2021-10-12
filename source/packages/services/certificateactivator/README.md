 # CERTIFICATE ACTIVATOR

## Introduction

The CDF Certificate Activator module is an opinionated reference implementation of how to integrate a Just In Time Registration (JITR) flow with CDF. The flow of events is:
- JITR registration flow triggers this module upon new `PENDING_ACTIVATION`.
- `deviceId` is extracted from the certificate common name.
- `certificateId` is checked against a certification revocation list. If invalid, it is then revoked.
- `deviceId` is verified with Asset Library to ensure it is whitelisted. If not whitelisted, it is then revoked.
- device is provisioned and associated with the certificate
- certificate is activated

## Dependencies

- It is assumed that:
  - the certificate common name represents the (base64 encoded) device id
  - the Asset Library is running in `full` mode which supports inherited documents, with a provisioning template configured and associated with group hierarcies as required
  - the provisioning template requires `ThingName` and `CertificateId` as parameters

## Useful Links

- [Application configuration](docs/configuration.md)
