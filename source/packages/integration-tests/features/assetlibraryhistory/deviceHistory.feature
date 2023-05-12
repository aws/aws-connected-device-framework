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

Feature: Device History

  @setup_deviceHistory_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-deviceHistory-device-type" exists
    And published assetlibrary group template "TEST-deviceHistory-group-type" exists
    And group "/test-devicehistory-group" exists

  Scenario:  Creating a new device logs a create event
    Given my authorization is
      | / | * |
    And device "TEST-deviceHistory-device001" does not exist
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I create device "TEST-deviceHistory-device001" with attributes
      | templateId  | TEST-deviceHistory-device-type              |
      | description | Description 1                               |
      | attributes  | {"firmwareVersion":"1"}                     |
      | groups      | {"linked_to":["/TEST-deviceHistory-group"]} |
    And pause for 2000ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | create                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |


  Scenario:  Modifying a device logs a modify event
    Given my authorization is
      | / | * |
    And device "TEST-deviceHistory-device001" exists
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I update device "TEST-deviceHistory-device001" with attributes
      | attributes | {"firmwareVersion":"2"} |
    And pause for 2000ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | modify                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |


  Scenario:  Deleting a device logs a delete event
    Given my authorization is
      | / | * |
    And device "TEST-deviceHistory-device001" exists
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I delete device "TEST-deviceHistory-device001"
    And pause for 500ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                 |
      | event    | delete                                                                                                                                                                                                                                                                       |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                      |


  Scenario:  Retrieve all events relating to this test
    When I retrieve 3 history records for device "TEST-deviceHistory-device001"
    Then history record 1 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                 |
      | event    | delete                                                                                                                                                                                                                                                                       |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                      |
    And history record 2 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | modify                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |
    And history record 3 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | create                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |


  Scenario:  Paginate all events relating to this test
    When I retrieve 3 history records for device "TEST-deviceHistory-device001"
    Then history record 1 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                 |
      | event    | delete                                                                                                                                                                                                                                                                       |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                      |
    Then history record 2 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | modify                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |
    And history record 3 contains attributes ignoring auth metadata
      | objectId | test-devicehistory-device001                                                                                                                                                                                                                                                              |
      | event    | create                                                                                                                                                                                                                                                                                    |
      | state    | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":[{"id":"/test-devicehistory-group"}]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type     | devices                                                                                                                                                                                                                                                                                   |


  @teardown_deviceHistory_feature
  Scenario: Teardown
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-deviceHistory-device-type" does not exist
    And published assetlibrary device template "TEST-deviceHistory-device-type" does not exist
    And draft assetlibrary group template "TEST-deviceHistory-group-type" does not exist
    And published assetlibrary group template "TEST-deviceHistory-group-type" does not exist
    And group "/test-devicehistory-group" does not exist
    And device "test-devicehistory-device001" does not exist

