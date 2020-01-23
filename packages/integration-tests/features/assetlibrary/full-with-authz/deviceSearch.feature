Feature: Device search

  @setup_deviceSearchWithAuth_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-deviceSearchWithAuthDevice" exists
    And device "TEST-deviceSearchWithAuth-001A" exists
    And device "TEST-deviceSearchWithAuth-001B" exists
    And device "TEST-deviceSearchWithAuth-002A" exists
    And device "TEST-deviceSearchWithAuth-002B" exists
    And group "/1/2/2" exists

  Scenario: Top level string attribute equals summary when authorized
    Given my authorization is
      | /1 | CR |
    When I search with summary with following attributes:
      | ancestorPath | /1/1 |
      | eq | deviceId:TEST-deviceSearchWithAuth-001A |
    Then search result contains 1 total

  Scenario: Top level string attribute equals when authorized
    Given my authorization is
      | /1 | CR |
    When I search with following attributes:
      | ancestorPath | /1/1 |
      | eq | deviceId:TEST-deviceSearchWithAuth-001A |
    Then search result contains 1 results
    And search result contains device "test-devicesearchwithauth-001a"

  Scenario: Custom string attribute equals when authorized
    Given my authorization is
      | /1 | CR |
    When I search with following attributes:
      | type | device |
      | ancestorPath | /1/1 |
      | eq | pair:black-black |
    Then search result contains 1 results
    And search result contains device "test-devicesearchwithauth-001a"

  Scenario: Top level string attribute not equals when authorized 1
    Given my authorization is
      | /1/1 | CR |
    And device "TEST-deviceSearchWithAuth-001A" exists
    When I search with following attributes:
      | ancestorPath | /1 |
      | neq | deviceId:TEST-deviceSearchWithAuth-001A |
      | type | device |
    Then search result contains 1 results
    And  search result contains device "test-devicesearchwithauth-001b"

  Scenario: Top level string attribute not equals when authorized 2
    Given my authorization is
      | /1/2 | CR |
    And device "TEST-deviceSearchWithAuth-002A" exists
    When I search with following attributes:
      | ancestorPath | /1 |
      | neq | deviceId:TEST-deviceSearchWithAuth-001A |
      | type | device |
    Then search result contains 2 results
    And search result contains device "test-devicesearchwithauth-002a"
    And search result contains device "test-devicesearchwithauth-002b"

 @teardown_deviceSearchWithAuth_feature
 Scenario: Teardown
  Given my authorization is
    | / | * |
   And device "TEST-deviceSearchWithAuth-001A" does not exist
   And device "TEST-deviceSearchWithAuth-001B" does not exist
   And device "TEST-deviceSearchWithAuth-002A" does not exist
   And device "TEST-deviceSearchWithAuth-002B" does not exist
   And group "/1" does not exist
