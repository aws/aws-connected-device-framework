Feature: Device search

  @setup_deviceSearch_feature
  Scenario: Setup
    Given published assetlibrary device template "TEST-deviceSearch-device" exists
    And device "TEST-deviceSearch-001A" exists
    And device "TEST-deviceSearch-001B" exists
    And device "TEST-deviceSearch-002A" exists
    And device "TEST-deviceSearch-002B" exists
    And group "/deviceSearch_feature" exists

  Scenario: Top level string attribute equals summary
    When I search with summary with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | eq | deviceId:TEST-deviceSearch-001A |
    Then search result contains 1 total

  Scenario: Top level string attribute equals
    When I search with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | eq | deviceId:TEST-deviceSearch-001A |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-001a"

  Scenario: Custom string attribute equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | eq | pair:black-black |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-001a"

  Scenario: Top level string attribute not equals
    And device "TEST-deviceSearch-001A" exists
    When I search with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | neq | deviceId:TEST-deviceSearch-001A |
    Then search result contains 3 results
    And  search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002a"
    And search result contains device "test-devicesearch-002b"

  Scenario: Custom string attribute not equals
    And device "TEST-deviceSearch-001A" exists
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | neq | pair:black-black |
    Then search result contains 3 results
    And  search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002a"
    And search result contains device "test-devicesearch-002b"

  Scenario: Top level string attribute starts with
    When I search with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | startsWith | deviceId:TEST-deviceSearch-001 |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-001a"
    And search result contains device "test-devicesearch-001b"

  Scenario: Custom string attribute starts with
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | startsWith | pair:black |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-001a"
    And search result contains device "test-devicesearch-001b"

  Scenario: Custom number attribute less than
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | lt | position:3 |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-001a"
    And search result contains device "test-devicesearch-001b"

  Scenario: Custom number attribute less than or equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | lte | position:3 |
    Then search result contains 3 results
    And search result contains device "test-devicesearch-001a"
    And search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002a"

  Scenario: Custom number attribute greater than
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | gt | position:3 |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-002b"

  Scenario: Custom number attribute greater than or equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | gte | position:3 |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-002a"
    And search result contains device "test-devicesearch-002b"

 @teardown_deviceSearch_feature
 Scenario: Teardown
   Given device "TEST-deviceSearch-001A" does not exist
   And device "TEST-deviceSearch-001B" does not exist
   And device "TEST-deviceSearch-002A" does not exist
   And device "TEST-deviceSearch-002B" does not exist
   And group "/deviceSearch_feature" does not exist
   And draft assetlibrary device template "TEST-deviceSearch-device" does not exist
   And published assetlibrary device template "TEST-deviceSearch-device" does not exist
