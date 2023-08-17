# SIMULATION MANAGER CONFIGURATION

The recommended way to create a local configuration file for the Simulation Manager is through CDF's [installer](../../installer/README.md#deployment-using-wizard).

# Configuration for Running Locally

Once you had deployed cdf to your AWS account, you can generate `.env` file to be used for your local development

The instruction to generate the local file can be found [here](../../installer/README.md#local-development). The `.env` file will be populated with resources and options that are specified during the deployment wizard flow.

```ini
# The S3 key prefix where Simulation artifacts will be stored
AWS_S3_PREFIX=simulations/
The allowed CORS origin to validate requests against.
CORS_ORIGIN=*
# Application logging level. Set to (in order) error, warn, info, verbose, debug or silly.
LOGGING_LEVEL=info
# local location where to store jmeter execution results
RUNNERS_DATADIR=/opt/apache-jmeter-5.1.1/bin/cdf
# Container allocated memory size. Tune for best performance.
RUNNERS_MEMORY=2048
# Container allocated cpu. Tune for best performance.
RUNNERS_CPU=1024
# Number of concurrent threads jmeter can run. This directly affects the number of Tasks that are spun up to run the simulation. Tune for best performance.
RUNNERS_THREADS=20
# The location of the provisioning task property template
TEMPLATES_PROVISIONING=packages/services/simulation-manager/src/templates/provisioning.task.properties
# The location of the simulation task property template
TEMPLATES_SIMULATION=packages/services/simulation-manager/src/templates/simulation.task.properties
```
