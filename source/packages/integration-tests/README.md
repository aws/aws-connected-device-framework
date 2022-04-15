# Automated Integration Tests

## Overview

Integration tests are executed against an instance of CDF deployed in an AWS account.
The tests send API requests to each module's API(s).
For example, one asset library module integration test creates device entries in the asset library database, then searching for them, then cleans up by deleting them.
The integration tests can be executed on a developer laptop, a Cloud9 instance, or as part of a CI pipeline, as long as CDF module APIs are reachable.
If you only have a subset of CDF modules deployed in your AWS account, you can filter the integration tests to only include those relevant for your setup.

***Note - Never run automated integration tests in a production environment!***

## Configuration

In order to make requests to the CDF environment, the integration test script must be configured with API base URLs, S3 bucket names, etc.
A list of common configuration settings is [here](src/config/README.md).

Many of the required settings originate from the [CDF client libraries](../libraries/clients/) which are used in integration tests to send requests to APIs.
Consult each client library's configuration Readme (e.g. [assetlibrary-client](../libraries/clients/assetlibrary-client/src/config/README.md)) for available client configuration settings.

If you only run a subset of integration tests, you can omit configuration settings not relevant to your subset of tests.

Save the configuration settings in a file anywhere on your system, for example `~/Desktop/integrationtests.env`.

## Running all integration tests

To run all tests and using a configuration file located at `~/Desktop/integrationtests.env`:

```sh
cd packages/integration-tests
CONFIG_LOCATION="~/Desktop/integrationtests.env" npm run integration-test
```

## Running a subset of integration tests

To only run integration tests for the commands module:

```sh
cd packages/integration-tests
CONFIG_LOCATION="~/Desktop/integrationtests.env" npm run integration-test -- features/commands/*.feature
```

Any path pattern or specific file can be specified after the `--`.
For example, to run only tests defined in the file [`features/assetlibrary/full/deviceSearch.feature`](features/assetlibrary/full/deviceSearch.feature):

```sh
CONFIG_LOCATION="~/Desktop/integrationtests.env" npm run integration-test -- features/assetlibrary/full/deviceSearch.feature
```

## Asset library integration tests

See [Asset Library integration tests](./features/assetlibrary/README.md).

## Integration tests and authentication

To run integration tests against CDF REST APIs that require authentication, you must ensure that the requests sent by the integration tests pass the authentication checks.
The following instructions are only concerned with enabling integration testing against authentication protected APIs at all, not the testing of authentication mechanisms.
For information on how the Asset Library module can optionally perform per-item authorization based on JWTs, see [Fine-grained Access Control](../services/assetlibrary/docs/fine-grained-access-control.md).

### Integration tests and API key authentication

Use each client library's `*_HEADERS` configuration setting to configure additional headers.
For example, with the Asset Library module and API key authentication:

```ini
ASSETLIBRARY_BASE_URL=https://xxxxxxxxxx.execute-api.xx-xx-xx.amazonaws.com/Prod
ASSETLIBRARY_HEADERS={"x-api-key": "xxxxxxxxxxxx"}
```

### Integration tests and token-based authentication

For example, with the Greengrass v2 Provisioning module and a Cognito User Pool that supports user-password authentication as source of authentication tokens:

```sh
export JWT=$(aws cognito-idp initiate-auth --auth-flow USER_PASSWORD_AUTH --client-id <COGNITO_CLIENT_ID> --auth-parameters "USERNAME=<USERNAME>,PASSWORD=<PASSWORD>" | jq  -r '.AuthenticationResult.IdToken')
export GREENGRASS2PROVISIONING_HEADERS="{\"Authorization\": \"Bearer ${JWT}\"}"
```

In this example, `GREENGRASS2PROVISIONING_HEADERS` is set as an environment variable instead of written to the configuration file because it changes frequently.
Environment variables overwrite configuration file settings.

Note, however, that full-grained access control test scenarios for the Asset Library module overwrite the `Authorization` header and will fail when using `ASSETLIBRARY_HEADERS` in this way.
