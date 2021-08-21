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

  @setup_deviceSearch_lite_feature
  Scenario: Setup
    Given assetlibrary device template "TEST-deviceSearch-device-004" exists
    And device "TEST-deviceSearch-001A" exists
    And device "TEST-deviceSearch-001B" exists
    And device "TEST-deviceSearch-002A" exists
    And device "TEST-deviceSearch-002B" exists
    And group "deviceSearch_feature" exists

  Scenario: Top level string attribute equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | eq | deviceId:TEST-deviceSearch-001A |
    Then search result contains 1 results
    And search result contains device "TEST-deviceSearch-001A"

  Scenario: Custom string attribute equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | eq | attributes.pair:black-black |
    Then search result contains 1 results
    And search result contains device "TEST-deviceSearch-001A"

  Scenario: Top level string attribute not equals
    And device "TEST-deviceSearch-001A" exists
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | neq | deviceId:TEST-deviceSearch-001A |
    Then search result contains 3 results
    And search result contains device "TEST-deviceSearch-001B"
    And search result contains device "TEST-deviceSearch-002A"
    And search result contains device "TEST-deviceSearch-002B"

  Scenario: Custom string attribute not equals
    And device "TEST-deviceSearch-001A" exists
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | neq | attributes.pair:black-black |
    Then search result contains 3 results
    And  search result contains device "TEST-deviceSearch-001B"
    And search result contains device "TEST-deviceSearch-002A"
    And search result contains device "TEST-deviceSearch-002B"

  Scenario: Top level string attribute starts with
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | startsWith | deviceId:TEST-deviceSearch-001 |
    Then search result contains 2 results
    And search result contains device "TEST-deviceSearch-001A"
    And search result contains device "TEST-deviceSearch-001B"

  Scenario: Custom string attribute starts with
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | startsWith | attributes.pair:black |
    Then search result contains 2 results
    And search result contains device "TEST-deviceSearch-001A"
    And search result contains device "TEST-deviceSearch-001B"

  Scenario: Custom number attribute less than
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | lt | attributes.position:3 |
    Then search result contains 2 results
    And search result contains device "TEST-deviceSearch-001A"
    And search result contains device "TEST-deviceSearch-001B"

  Scenario: Custom number attribute less than or equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | lte | attributes.position:3 |
    Then search result contains 3 results
    And search result contains device "TEST-deviceSearch-001A"
    And search result contains device "TEST-deviceSearch-001B"
    And search result contains device "TEST-deviceSearch-002A"

  Scenario: Custom number attribute greater than
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | gt | attributes.position:3 |
    Then search result contains 1 results
    And search result contains device "TEST-deviceSearch-002B"

  Scenario: Custom number attribute greater than or equals
    When I search with following attributes:
      | type | device |
      | ancestorPath | deviceSearch_feature |
      | gte | attributes.position:3 |
    Then search result contains 2 results
    And search result contains device "TEST-deviceSearch-002A"
    And search result contains device "TEST-deviceSearch-002B"

  @teardown_deviceSearch_lite_feature
  Scenario: Teardown
    Given device "TEST-deviceSearch-001A" does not exist
    And device "TEST-deviceSearch-001B" does not exist
    And device "TEST-deviceSearch-002A" does not exist
    And device "TEST-deviceSearch-002B" does not exist
    And group "deviceSearch_feature" does not exist
    And assetlibrary device template "TEST-deviceSearch-device-004" exists with attributes:
      | status | deprecated |
