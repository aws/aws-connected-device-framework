# Automated Integration Tests

Note - Never run auotmated integration tests in a production environment!

To run:

- Create a configuration file as follows (updating with correct urls):

```sh
{
  "assetLibrary": {
    "baseUrl": "http://localhost:3000"
  },
  "commands": {
      "baseUrl": "http://localhost:3002"
  }
}
```

- To run all integration tests:

```sh
INTEGRATIONTESTS_CONFIG_LOCATION="{config-file.json)" npm run test 
```

- To run tests for a specific feature:

```sh
INTEGRATIONTESTS_CONFIG_LOCATION="{config-file.json)" npm run test -- features/commands/*.feature
```