# BULK CERTS CONFIGURATION

The recommended way to create a local configuration file for the Bulk Certs service is through CDF's [installer](../../installer/README.md#deployment-using-wizard).

## Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
## For each CA alias, set the CA ID. E.g. for CA alias "alias1" which has CA ID "id1", set:
# SUPPLIER_CA_ALIAS1=id1
```

## The following may be overridden:

```ini
# Attributes to add to the generated certificates. At least one value must be provided:
CERTIFICATE_DEFAULT_COMMONNAME=
CERTIFICATE_DEFAULT_ORGANIZATION=
CERTIFICATE_DEFAULT_ORGANIZATIONALUNIT=
CERTIFICATE_DEFAULT_LOCALITY=
CERTIFICATE_DEFAULT_STATENAME=
CERTIFICATE_DEFAULT_COUNTRY=
CERTIFICATE_DEFAULT_EMAILADDRESS=
CERTIFICATE_DEFAULT_DISTINGUISHEDNAMEQUALIFIER=
CERTIFICATE_DEFAULT_EXPIRYDAYS=365

CORS_EXPOSED_HEADERS=content-type,location
CORS_ORIGIN=*
CUSTOMDOMAIN_BASEPATH=

LOGGING_LEVEL=info
```
