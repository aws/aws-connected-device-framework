Feature: Device lifecycle

  @setup_devicesWithAuth_feature
  Scenario: Setup
    When my authorization is
      | "/1:" | * |
    Given group "/1/2/2" exists
    And device template "TEST-devicesWithAuthDevice" exoists

  Scenario: Create a Device within an authorized group
    Given device "TEST-devicesWithAuth-device001" does not exist
    When my authorization is
      | "/1/2/1" | C |
    And I create device "TEST-devicesWithAuth-device001" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | description | My description |
      | state | active |
      | groups | { "out": { "linked_to": ["/test-devices-linkablegroup001"]}} |
    Then device "TEST-devicesWithAuth-device001" exists

  Scenario: Create a Device within an unauthorized group is forbidden
    Given device "TEST-devicesWithAuth-device001" does not exist
    When my authorization is
      | "/1/2/1" | R |
    And I create device "TEST-devicesWithAuth-device002" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | description | My description |
      | state | active |
      | groups | { "out": { "linked_to": ["/test-devices-linkablegroup001"]}} |
    Then it fails with a 403
    And device "TEST-devicesWithAuth-device002" does not exist


  @teardown_devicesWithAuth_feature
  Scenario: Teardown
    When my authorization is
      | "/1" | * |
    Given draft assetlibrary device template "TEST-devicesWithAuthDevice" does not exist
    And published assetlibrary device template "TEST-devicesWithAuthDevice" does not exist
    And draft assetlibrary group template "TEST-devicesWithAuthGroup" does not exist
    And published assetlibrary group template "TEST-devicesWithAuthGroup" does not exist
