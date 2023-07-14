## The following env config needs defining per environment:

````ini
AWS_REGION=

## Required if running in full mode (the default):
AWS_NEPTUNE_URL=

## Required if running in lite mode only:
AWS_IOT_ENDPOINT=

## The following may be overridden:

```ini
AUTHORIZATION_ENABLED=false
CUSTOMDOMAIN_BASEPATH=
DEFAULTS_DEVICES_PARENT_GROUPPATH=/unprovisioned
DEFAULTS_DEVICES_PARENT_RELATION=parent
DEFAULTS_DEVICES_STATE=unprovisioned
DEFAULTS_GROUPS_VALIDATEALLOWEDPARENTPATHS=false
LOGGING_LEVEL=info
MODE=full
````
