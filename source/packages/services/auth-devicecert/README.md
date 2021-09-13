  

# CUSTOM DEVICE AUTHORIZER

This is a reference implementation of how a custom authorizer can be used as an alternate validation mechanism to authenticate devices with API Gateway.

This custom authorizer is useful for constrained devices which are incapable of using the [AWS IoT Credentials Provider](https://docs.aws.amazon.com/iot/latest/developerguide/authorizing-direct-aws.html) to obtain temporary AWS credentials using the device's X.509 certificate.  Note that the AWS IoT Credentials Provider method is the recommended approach where possible.

Since creating this reference application, API Gateway now supports [mutual authentication](https://aws.amazon.com/blogs/compute/introducing-mutual-tls-authentication-for-amazon-api-gateway/) which would be a recommended approach to using this specific application, but is kept here as reference.

## Introduction

The custom authorizer module utilizes [API Gateway Custom Authorizer](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html). A Lambda based authorizer uses information described by headers (`deviceCert` and `deviceId`) to then validate whether the device certificate was signed by the registered CA certificate.

For a valid policy, API Gateway caches the returned policy, associated with the incoming source request parameters. It then uses the cached policy for the current and subsequent requests, over a pre-configured time-to-live (TTL) period of 300 seconds.

The request to the device custom authorizer requires the following two http headers setting:

```
deviceid: < device id >
devicecert: < device certificate >
```

An example of the headers as follows:

```
deviceid: edsn001
devicecert: -----BEGIN CERTIFICATE-----\nMIIDWjCCAkICCQCHBZwUBuqWrTANBgkqhkiG9w0BAQsFADCBiDELMAkGA1UEBhMC\nVVMxCzAJBgNVBAgMAkNPMQ8wDQYDVQQHDAZEZW52ZXIxEDAOBgNVBAoMB0N1bW1p\nbnMxEDAOBgNVBAsMB0VuZ2luZXMxFjAUBgNVBAMMDSouY3VtbWlucy5jb20xHzAd\nBgkqhkiG9w0BCQEWEGluZm9AY3VtbWlucy5jb20wHhcNMTgwNzEyMTU1NjQwWhcN\nMTkwNzEyMTU1NjQwWjBVMQswCQYDVQQGEwJVUzELMAkGA1UECAwCQ0ExDzANBgNV\nBAoMBm1hcmluZTESMBAGA1UECwwJZXF1aXBtZW50MRQwEgYDVQQDDAtjdW1taW5z\nLmNvbTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBANU5kNASl7cFq6u\/\nFHALUlR6U77FLc2lQx5DZzXGimDQZXzQ68oBC1kRSv1oxCBzK889r7Awj\/4xcvVO\nUPudS9etP6gpMb2af0UinLN5eM0AMjUsdipqBJGbkDMS2RCD+tXsJHKUUVhlp+yO\ncdQs+dd7s5sWIg8IUMHuMPSHl6hkOYStlkx7+WdPTliS2\/OjClHjcWi0G0BtCgu6\nwV2p7OjVo68741Jl8aQ0N9yEU4mHJiES7JkbsVZWgf46FDUHDCOTeeZHV6EHoJ6R\n\/9fLT2eGFtFez8HjWB6KLwA1mRk3DdRHx4iRV5NvoY44JxxTJj1Lc71v4bye0aul\ni0rdQGkCAwEAATANBgkqhkiG9w0BAQsFAAOCAQEAiOpehqcOU8FVU2dPO8a6+R6u\n62O27q7djQgtnQ4\/KudiYz6JrYolEO8waC5m+4xjqZJ+WcnF8RU9jSWsnsdNL3E6\nfVQ65N8Fx\/9NRmborrWuVhAOGH0XJzaNHUbhHNThlYazAquF5QpS4TWqnJyl+tTy\nB7EH24hj7j3ghjccnr3bN4\/NfKZ9IBtXaDj9CVIcX91K+ZgbkhLo\/Tn\/iUHvjvbJ\nTCz+5rb0BTLzVV8kyp05OuVy21abUrERG3kzx4sHZ419Em9AeVZm+P8EifIBvYrV\n\/9pYhgyN0kJTpPu1Bin4y1UqHmDziddDQXbYBzLS5ov0nX3C\/MeRO1IdsAdorw==\n-----END CERTIFICATE-----
```

## Useful Links

- [Application configuration](docs/configuration.md)
- 