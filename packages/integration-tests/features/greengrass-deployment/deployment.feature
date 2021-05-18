Feature: Greengrass Core Deployment

  @setup_deployment_features
  Scenario: Setup
    Given greengrass-deployment template "test_template" exists

  Scenario: Create an agentbased deployment for a greengrass core which does not exist
    Given greengrass-deployment template "test_template" exists
    And thing "gg_test_core_01" does not exist
    When I create a deployment for "gg_test_core_01" greengrass core
    Then it fails with a 404

  Scenario: Create an agentbased deployment for a greengrass core which exist but not activated
    Given greengrass-deployment template "test_template" exists
    And thing "gg_test_core" exists
    When I create a deployment for "gg_test_core" greengrass core
    Then it fails with a 409

  Scenario: list deployments for a greengrass core which does not exists
    Given greengrass-deployment template "test_template" exists
    And thing "gg_test_core_01" does not exist
    When I list deployments for "gg_test_core_01" greengrass core
    Then it fails with a 404

  Scenario: list deployments for a greengrass core which exists with no deployments
    Given greengrass-deployment template "test_template" exists
    And thing "gg_test_core" exists
    When I list deployments for "gg_test_core" greengrass core
    Then a list of deployments for "gg_test_core" exists with attributes
      | $.deployments.length | 0 |

  Scenario: delete deployment for a greengrass core which does not exist
    Given thing "gg_test_core" exists
    When I delete "nonexistent-deployment" for a device "gg_test_core"
    Then it fails with a 404

  @teardown_deployment_features
  Scenario: Teardown
    Given greengrass-deployment template "test_template" does not exist



