
# Device Monitoring

A device monitoring module provides near real-time device status - connected and disconnected.

## Introduction
  

The device monitoring module utilizes [AWS IoT Lifecycle Events](https://docs.aws.amazon.com/iot/latest/developerguide/life-cycle-events.html) feature. Whenever the device connects or disconnects, AWS IoT Core emits a smaple event that is then picked up by AWS Lambda. It parses the eventType and then updating the device attributes in Asset Library to connected as `true` or `false`


The following sample represents the schema that AWS IoT core emits when a device connects or disconnects

```
{
  "Event": {
    "clientId": "client",
    "timestamp": 1460065214626,
    "eventType": "connected",
    "sessionIdentifier": "00000000-0000-0000-0000-000000000000",
    "principalIdentifier": "000000000000/ABCDEFGHIJKLMNOPQR:some-user/ABCDEFGHIJKLMNOPQR:some-user"
  }
}
```

## Additional Links
- [Application configuration](docs/configuration.md)
