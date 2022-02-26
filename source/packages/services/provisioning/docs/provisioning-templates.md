# PROVISIONING TEMPLATES

The Provisioning module manages the provisioning of things, certificates and policies via [Provisioning Templates](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html).

## TL;DR - Examples

The following accepts `ThingName` as a parameter. A thing is created with the name set to `Parameters.ThingName`. As the `CDF.createDeviceCertificate` extension is set to `true`, a certificate is automatically created on behalf of the device, with the values of `Parameters.CertificatePem` and `Parameters.CaCertificatePem` auto-populated. These values are used in the registration of the certificate which is set to automatically activated and associated with the device. The existing `myPolicy` is attached to the certificate. As the `CDF.attachAdditionalPolicies` extension is set, the `attachAdditionalPolicies` policy is also associated with the certificate.

```xml
{
    "Parameters": {
        "ThingName": {
            "Type": "String"
        },
        "CertificatePem": {
            "Type": "String"
        },
        "CaCertificatePem": {
            "Type": "String"
        }
    },
    "Resources": {
        "thing": {
            "Type": "AWS::IoT::Thing",
            "Properties": {
                "ThingName": {
                    "Ref": "ThingName"
                }
            },
            "OverrideSettings": {
                "ThingTypeName": "REPLACE"
            }
        },
        "certificate": {
            "Type": "AWS::IoT::Certificate",
            "Properties": {
                "CACertificatePem": {
                    "Ref": "CaCertificatePem"
                },
                "CertificatePem": {
                    "Ref": "CertificatePem"
                },
                "Status": "ACTIVE"
            },
            "OverrideSettings": {
                "Status": "REPLACE"
            }
        },
        "policy": {
            "Type": "AWS::IoT::Policy",
            "Properties": {
                "PolicyName": "myPolicy"
            }
        }
    },
    
    "CDF": {
        "createDeviceCertificate": true,
        "attachAdditionalPolicies": [{
            "name": "attachAdditionalPolicies"
        }]
    }
}
```

Refer to the [AWS IoT documentation](https://docs.aws.amazon.com/iot/latest/developerguide/provision-template.html) for further examples such as adding attributes to the Thing, associating a Thing with a Thing Type and/or Thing Group, using alternate methods of creating certificates such as by providing a CSR, and creating new policies to associate with the certificate.

## CDF Extensions

CDF extends AWS IoT Provisioning Templates by allowing the following extra configuration options to be applied to enhance the functionality of provisioning templates:

### `$.CDF.createDeviceCertificate` 
If set to `true`, a certificate will be created on behalf of the device, which can then be used as configured in the template to register and associate with the device.  By default, is `false`.

The following attributes, provided as part of the `POST /things` request body, are available to further configure this option:

```json
{
    ...
    "cdfProvisioningParameters": {
        "caId": "?",                        // ID of a registered CA to use to create the device certificate. Mandatory.
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
    ...
}
```


### `$.CDF.registerDeviceCertificateWithoutCA` 
If set to `true`, the certificate PEM provided is registered without a CA.  By default, is `false`. 

The following attributes, provided as part of the `POST /things` request body, are available to further configure this option:

```json
{
    ...
    "cdfProvisioningParameters": {
        "certificatePem": "?",                   // mandatory
        "certificateStatus": "ACTIVE|INACTIVE"   // mandatory
    }
    ...
}
```

### `$.CDF.attachAdditionalPolicies`

A standard AWS IoT Provisoning Template allows just a single IoT Policy attaching to the certificate. This setting allows attaching multiple additional policies.

Specify names of existing policies, or name and definition of new policies to create, in the template as follows:

```json
{
    ...
    "CDF": {    
        "attachAdditionalPolicies": {
            "policies": [{
                "name": "?",                // Optional. String. Defaults to a hash of the policy document. If you are using an existing AWS IoT policy, for the PolicyName property, enter the name of the policy. Do not include the PolicyDocument property.

                "document": "?"             // Optional. A JSON object specified as an escaped string. If PolicyDocument is not provided, the policy must already be created.
            }]
        }
    }
}
```




### `$.CDF.clientIdMustMatchThingName` 

> **Deprecated**. Instead use the builtin AWS IoT `iot:Connection.Thing.IsAttached: ["true"]` policy variable.

If set to `true`, a policy will be created and associated with the certificate that enforces a device's MQTT clientId to match the AWS Thing Name.  By default, is `false`.