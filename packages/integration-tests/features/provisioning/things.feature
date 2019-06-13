Feature: Provisioning Things

  @setup_thing_provisioning
  Scenario: Setup
    Given thing "IntegrationTestThing" does not exist

  Scenario: Provision a Thing
    Given thing "IntegrationTestThing" does not exist
    When I provision a thing "IntegrationTestThing"
    Then the thing "IntegrationTestThing" is provisioned

  @teardown_thing_provisioning
  Scenario: Teardown
    Given thing "IntegrationTestThing" does not exist
