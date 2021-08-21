Feature: Device Activation

  @setup_activation_features
  Scenario: Setup
    Given  thing "gg_test_core" exists

  Scenario: Create a Device Activation for a greengrass core which does not exist
    Given thing "gg_test_core_01" does not exist
    When I create an activation for "gg_test_core_01" greengrass core
    Then it fails with a 404

  Scenario: Create a device activation for a greengrass core which exists
    Given thing "gg_test_core" exists
    When I create an activation for "gg_test_core" greengrass core
    Then an activation is created with attributes
      | $.activationId | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$ |
      | $.activationCode | ___regex___:^[ A-Za-z0-9_@.\/#&+-]{20}$ |
      | $.activationRegion | ___regex___:^[A-Za-z0-9_\-]{9,}$ |
    And an activation exists for "gg_test_core" with attributes
      | $.activationId   | ___regex___:^[A-Fa-f0-9]{8}-([A-Fa-f0-9]{4}-){3}[A-Fa-f0-9]{12}$       |
      | $.deviceId       | gg_test_core                                                           |
      | $.createdAt      | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt      | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Delete the activation for greengrass core which exists
    Given thing "gg_test_core" exists
    And  I create an activation for "gg_test_core" greengrass core
    When I delete the last activation for "gg_test_core" greengrass core
    Then the last activation does not exists for "gg_test_core"

  @teardown_activation_features
  Scenario: Teardown
    Given thing "gg_test_core" does not exist

