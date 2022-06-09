## The following mandatory env config needs defining per environment:

```ini
AWS_REGION=
AWS_S3_CRL_BUCKET=

ASSETLIBRARY_API_FUNCTION_NAME=
PROVISIONING_API_FUNCTION_NAME=

# if a profile is to be used when creatin/update devices, specify the name of profile for the device template in the format of ASSETLIBRARY_TEMPLATEPROFILES_<TEMPLATENAME>=<PROFILE>
# e.g. ASSETLIBRARY_TEMPLATEPROFILES_EDGE=default
```

## The following may be overridden:

```ini
AWS_S3_CRL_KEY=crl/crl.json
LOGGING_LEVEL=info
```
