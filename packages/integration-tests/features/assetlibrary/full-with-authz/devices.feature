Feature: Device lifecycle

  @setup_devicesWithAuth_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    And group "/1/2/2" exists
    And published assetlibrary device template "TEST-devicesWithAuthDevice" exists

  Scenario: Create a Device when authorized
    Given my authorization is
      | /1/2/1 | CR |
    When I create device "TEST-devicesWithAuth-device001" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | description | My description |
      | state | active |
      | groups | { "linked_to": ["/1/2/1"]} |
    Then device "TEST-devicesWithAuth-device001" exists

  Scenario: Cannot create a Device when unauthorized due to access level
    Given my authorization is
      | /1/2/1 | R |
    When I create device "TEST-devicesWithAuth-device002" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | description | My description |
      | state | active |
      | groups | { "linked_to": ["/1/2/1"]} |
    Then it fails with a 403
    And device "TEST-devicesWithAuth-device002" does not exist

  Scenario: Cannot create a Device when unauthorized due to path
    Given my authorization is
      | /xxxxx | CR|
    When I create device "TEST-devicesWithAuth-device003" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | description | My description |
      | state | active |
      | groups | { "linked_to": ["/1/2/1"]} |
    Then it fails with a 403
    And device "TEST-devicesWithAuth-device003" does not exist

  Scenario: Update a device when authorized
    Given my authorization is
      | /1/2/1 | UR |
    When I update device "TEST-devicesWithAuth-device001" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | attributes | {"model":"A"} |
    Then device "TEST-devicesWithAuth-device001" exists with attributes
      | description | My description |
      | templateId | test-deviceswithauthdevice |
      | attributes | {"model":"A"} |

  Scenario: Cannot update a device when unauthorized due to access level
    Given my authorization is
      | /1/2/1 | R |
    When I update device "TEST-devicesWithAuth-device001" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | attributes | {"model":"A"} |
    Then it fails with a 403

  Scenario: Cannot update a device when unauthorized due to path
    Given my authorization is
      | /xxxxx | UR |
    When I update device "TEST-devicesWithAuth-device001" with attributes
      | templateId | TEST-devicesWithAuthDevice |
      | attributes | {"model":"A"} |
    Then it fails with a 403

  Scenario: Cannot delete the device when unauthorized due to access level
    Given my authorization is
      | /1/2/1 | R |
    Given device "TEST-devicesWithAuth-device001" exists
    When I delete device "TEST-devicesWithAuth-device001"
    Then it fails with a 403

  Scenario: Cannot delete the device when unauthorized due to path
    Given my authorization is
      | /1/2/1 | R |
      | /xxxxx | D |
    Given device "TEST-devicesWithAuth-device001" exists
    When I delete device "TEST-devicesWithAuth-device001"
    Then it fails with a 403

  Scenario: Delete the device when authorized
    Given my authorization is
      | /1/2/1 | DR |
    Given device "TEST-devicesWithAuth-device001" exists
    When I delete device "TEST-devicesWithAuth-device001"
    Then device "TEST-devicesWithAuth-device001" does not exist


  @teardown_devicesWithAuth_feature
  Scenario: Teardown
