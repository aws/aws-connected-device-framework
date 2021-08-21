# PROVISIONING TEMPLATES

The provisioning service manages the provisioning of things, certificates and policies via [Provisioning Templates](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html).

In addition, CDF extends the provisoning service by allowing the following extra configuration to be applied to a provisioning template:

### `$.CDF.clientIdMustMatchThingName` 
If set to `true`, a policy will be created and associated with the certificate in context that enforces a device's MQTT clientId to match the AWS Thing Name.  By default, is `false`.

### `$.CDF.createDeviceCertificate` 
If set to `true`, a certificate will be created on behalf of the device, which can then be used as configured in the template to register and associate with the device.  By default, is `false`.

The following REST request attributes are available to further configure this option:

```json
{
    "certInfo": {
        "commonName": "?",              // optional
        "organization": "?",            // optional
        "organizationalUnit": "?",      // optional
        "locality": "?",                // optional
        "stateName": "?",               // optional
        "country": "?",                 // mandatory
        "emailAddress": "?",            // optional
        "daysExpiry": ?                 // optional

    }
}
```


### `$.CDF.registerDeviceCertificateWithoutCA` 
If set to `true`, the certificate PEM provided in CDF Parameters will get registered without a CA.  By default, is `false`. |