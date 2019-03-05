# Integration testing

## Introduction

[BDD (Behavior Driven Development)](https://docs.cucumber.io/bdd/overview/) is the approach taken to automated integration testing.  This involves writing human readable executable test scenarios in [Gherkin](https://docs.cucumber.io/gherkin/reference/), with the execution of the test scenarios implemented using [Cucumeber](https://docs.cucumber.io/cucumber/).

All BDD tests are located in the `cdf-integration-tests` project.

If you are unfamiliar with BDD/Gherkin/Cucumber, read this [introduction](https://docs.cucumber.io/guides/overview/), [10 iminute tutorial](https://docs.cucumber.io/guides/10-minute-tutorial/).

## Test Scenarios

Refer to the `cdf-integration-tests/features` directory for examples of test scenarios.  Each service being tested (e.g. asset library) has its own sub directory, with a separate feature file representing the dfferent areas of the service to test.  Each feature file is comprised of multiple test scenarios.

Note:  Ignore the `cdf-integration-tests/features/step_definitions` and `cdf-integration-tests/features/support` directories.  These are auto-generated.

## Test Execution Steps

Refer to the `cdf-integration-tests/src/step_definitions` directory for details of how the steps of each test scenario are executed.

Any pre/post hooks (defined by annotations in the test scenarios) are added to `cdf-integration-tests/src/support`.

## Running the Integration Steps

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