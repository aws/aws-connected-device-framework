#-----------------------------------------------------------------------------------------------------------------------
#   Copyright Amazon.com Inc. or its affiliates. All Rights Reserved.
#
#  Licensed under the Apache License, Version 2.0 (the "License"). You may not use this file except in compliance
#  with the License. A copy of the License is located at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
#  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES
#  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions
#  and limitations under the License.
#-----------------------------------------------------------------------------------------------------------------------

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

  Scenario: Top level string attribute ends with
    When I search with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | endsWith | deviceId:b |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002b"

  Scenario: Custom string attribute ends with
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | endsWith | pair:white |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002b"

  Scenario: Top level string attribute contains
    When I search with following attributes:
      | ancestorPath | /deviceSearch_feature |
      | contains | deviceId:rch-002 |
    Then search result contains 2 results
    And search result contains device "test-devicesearch-002a"
    And search result contains device "test-devicesearch-002b"

  Scenario: Custom string attribute contains
    When I search with following attributes:
      | type | device |
      | ancestorPath | /deviceSearch_feature |
      | contains | pair:white |
    Then search result contains 3 results
    And search result contains device "test-devicesearch-001b"
    And search result contains device "test-devicesearch-002a"
    And search result contains device "test-devicesearch-002b"

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

  Scenario: Multiple search criteria including a traversal
    When I search with following attributes:
      | type | TEST-deviceSearch-device-004 | 
      | eq | located_at:out:name:deviceSearch_feature,deviceId:TEST-deviceSearch-001A,pair:black-black |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-001a"

  Scenario: Multiple search criteria including a traversal with changed order of search criteria
    When I search with following attributes:
      | type | TEST-deviceSearch-device-004 | 
      | eq | deviceId:TEST-deviceSearch-001A,located_at:out:name:deviceSearch_feature,pair:black-black |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-001a"

  Scenario: Multiple search criteria including a traversal with another changed order of search criteria
    When I search with following attributes:
      | type | TEST-deviceSearch-device-004 | 
      | eq | deviceId:TEST-deviceSearch-001A,pair:black-black,located_at:out:name:deviceSearch_feature |
    Then search result contains 1 results
    And search result contains device "test-devicesearch-001a"

 @teardown_deviceSearch_feature
 Scenario: Teardown
   Given device "TEST-deviceSearch-001A" does not exist
   And device "TEST-deviceSearch-001B" does not exist
   And device "TEST-deviceSearch-002A" does not exist
   And device "TEST-deviceSearch-002B" does not exist
   And group "/deviceSearch_feature" does not exist
   And draft assetlibrary device template "TEST-deviceSearch-device" does not exist
   And published assetlibrary device template "TEST-deviceSearch-device" does not exist
