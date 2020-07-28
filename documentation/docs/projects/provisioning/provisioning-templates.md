# PROVISIONING TEMPLATES

The provisioning service manages the provisioning of things, certificates and policies via [Provisioning Templates](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html).

In addition, CDF extends the provisoning service by allowing the following extra configuration to be applied to a provisioning template:

| Json attribute | Description |
| --- | --- |
| `$.CDF.clientIdMustMatchThingName` | If set to `true`, a policy will be created and associated with the certificate in context that enforces a device's MQTT clientId to match the AWS Thing Name.  By default, or not provided, is `false`. |
| `$.CDF.createDeviceCertificate` | If set to `true`, a certificate will be created on behlaf of the device, which can then be used as configured in the template to registere and associate with the device.  By default, or not provided, is `false`. |
| `$.CDF.registerDeviceCertificateWithoutCA` | If set to `true`, the certificate PEM provided in CDF Parameters will get registered without a CA.  By default, or not provided, is `false`. |