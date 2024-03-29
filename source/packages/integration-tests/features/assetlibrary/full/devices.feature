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

Feature: Device lifecycle

  @setup_devices_feature
  Scenario: Setup
    Given group "/TEST-devices-linkableGroup001" exists
    And group "/TEST-devices-unlinkableGroup001" exists
    And device "test-devices-linkabledevice001" exists


  # All three outbound relations need to be included in auth. The group and linked device also have auth paths that point to root.
  # This ensures that as long as the device with this template keeps one relation, it can always be deleted by [/:*] auth in Teardown.
  Scenario: Create a new Device Template
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-devices-type" does not exist
    And published assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}}                                                                                                                                                                    |
      | required   | ["model"]                                                                                                                                                                                                                                |
      | relations  | {"out":{"linked_to":[{"name": "test-devices-linkablegroup", "includeInAuth":true}],"parent":[{"name": "test-devices-linkablegroup", "includeInAuth": true}],"sibling":[{"name": "test-devices-linkabledevice", "includeInAuth": true}]}} |
    And publish assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" exists with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}}                                                                                                                                                                    |
      | required   | ["model"]                                                                                                                                                                                                                                |
      | relations  | {"out":{"linked_to":[{"name": "test-devices-linkablegroup", "includeInAuth":true}],"parent":[{"name": "test-devices-linkablegroup", "includeInAuth": true}],"sibling":[{"name": "test-devices-linkabledevice", "includeInAuth": true}]}} |


  Scenario: Create a Device with valid attributes
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" does not exist
    When I create device "TEST-devices-device001" with attributes
      | templateId     | TEST-devices-type                                               |
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | state          | active                                                          |
      | groups         | {"out":{"linked_to":["/test-devices-linkablegroup001"]}}        |
      | devices        | {"out":{"sibling":["test-devices-linkabledevice001"]}}          |
      | attributes     | {"serialNumber":"S001","model":"A"}                             |
    Then device "TEST-devices-device001" exists with attributes
      | templateId     | test-devices-type                                               |
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | state          | active                                                          |
      | groups         | {"out":{"linked_to":["/test-devices-linkablegroup001"]}}        |
      | devices        | {"out":{"sibling":["test-devices-linkabledevice001"]}}          |
      | attributes     | {"serialNumber":"S001","model":"A"}                             |


  Scenario: Create a Device with missing required custom attributes fails
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device002" does not exist
    When I create device "TEST-devices-device002" with invalid attributes
      | templateId | TEST-devices-type       |
      | attributes | {"serialNumber":"S001"} |
    Then it fails with a 400
    And device "TEST-devices-device002" does not exist


  Scenario: Create a Device with no state or parent applies the defaults
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device003" does not exist
    When I create device "TEST-devices-device003" with attributes
      | templateId | TEST-devices-type                   |
      | attributes | {"serialNumber":"S001","model":"A"} |
    Then device "TEST-devices-device003" exists with attributes
      | templateId | test-devices-type                     |
      | state      | unprovisioned                         |
      | groups     | {"out":{"parent":["/unprovisioned"]}} |
      | attributes | {"serialNumber":"S001","model":"A"}   |


  Scenario: Create a Device attempting to associate with an unlinkable group fails
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device004" does not exist
    When I create device "TEST-devices-device004" with invalid attributes
      | templateId | TEST-devices-type                                          |
      | state      | active                                                     |
      | groups     | {"out":{"linked_to":["/test-devices-unlinkablegroup001"]}} |
      | attributes | {"serialNumber":"S001","model":"A"}                        |
    Then it fails with a 400
    And device "TEST-devices-device004" does not exist


  Scenario: Update existing device attributes
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":"B"}     |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"serialNumber":"S001","model":"B"}                             |


  Scenario: Update existing device to have no outbound relations to groups
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | groups | {"out":{} } |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"serialNumber":"S001","model":"B"}                             |
      | groups         | {}                                                              |
      | devices        | {"out":{"sibling":["test-devices-linkabledevice001"]}}          |


  Scenario: Update existing device to have no relations to device, re-add original group
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | groups  | {"out":{"linked_to":["/test-devices-linkablegroup001"]}} |
      | devices | {"out":{} }                                              |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"serialNumber":"S001","model":"B"}                             |
      | groups         | {"out":{"linked_to":["/test-devices-linkablegroup001"]}}        |
      | devices        | {}                                                              |

  Scenario: Update different existing device with inbound relationship, check in/out state of new relationship on both devices
    Given my authorization is
      | / | * |
    And device "test-devices-linkabledevice001" exists
    When I update device "test-devices-linkabledevice001" with attributes
      | devices | {"in":{"sibling":["TEST-devices-device001"]} } |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"serialNumber":"S001","model":"B"}                             |
      | groups         | {"out":{"linked_to":["/test-devices-linkablegroup001"]}}        |
      | devices        | {"out":{"sibling":["test-devices-linkabledevice001"]}}          |
    Then device "test-devices-linkabledevice001" exists with attributes
      | devices | {"in":{"sibling":["test-devices-device001"]}} |


  Scenario: Test device is back to original state, update with exact same groups
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | groups  | {"out":{"linked_to":["/test-devices-linkablegroup001"]}} |
      | devices | {"out":{"sibling":["test-devices-linkabledevice001"]}}   |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"serialNumber":"S001","model":"B"}                             |
      | groups         | {"out":{"linked_to":["/test-devices-linkablegroup001"]}}        |
      | devices        | {"out":{"sibling":["test-devices-linkabledevice001"]}}          |


  Scenario: Clear existing custom device attribute
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type     |
      | attributes | {"serialNumber":null} |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"model":"B"}                                                   |


  # Covers https://github.com/aws/aws-connected-device-framework/issues/64
  Scenario: Clear existing custom device attribute while updating others
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type                 |
      | attributes | {"serialNumber":null,"model":"C"} |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description                                                  |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001 |
      | attributes     | {"model":"C"}                                                   |


  Scenario: Clear existing top level device attribute
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId     | TEST-devices-type |
      | awsIotThingArn | ___null___        |
    Then device "TEST-devices-device001" exists with attributes
      | description    | My description  |
      | awsIotThingArn | ___undefined___ |
      | attributes     | {"model":"C"}   |


  Scenario: Device Ids are unique
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I create device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":"A"}     |
    Then it fails with a 409


  Scenario: Retrieving a device that does not exist
    Given my authorization is
      | / | * |
    And device "TEST-devices-typeXXX" does not exist
    When I get device "TEST-devices-typeXXX"
    Then it fails with a 404


  Scenario: Should not be able to clear existing device required attributes
    Given my authorization is
      | / | * |
    And device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":null}    |
    Then it fails with a 400


  Scenario: Should not be able to delete a template when devices still exist
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" exists
    When I delete assetlibrary device template "TEST-devices-type"
    Then it fails with a 409
    And published assetlibrary device template "TEST-devices-type" exists


  Scenario: Delete the device
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" exists
    When I delete device "TEST-devices-device001"
    And I delete device "TEST-devices-device003"
    Then device "TEST-devices-device001" does not exist
    And device "TEST-devices-device003" does not exist


  Scenario: Should be able to delete a template when no devices exist
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" does not exist
    And device "TEST-devices-device003" does not exist
    When I delete assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" does not exist

  @teardown_devices_feature
  Scenario: Teardown
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" does not exist
    And draft assetlibrary group template "TEST-devices-linkableGroup" does not exist
    And published assetlibrary group template "TEST-devices-linkableGroup" does not exist
    And draft assetlibrary group template "TEST-devices-unlinkableGroup" does not exist
    And published assetlibrary group template "TEST-devices-unlinkableGroup" does not exist
    And draft assetlibrary device template "TEST-devices-linkableDevice" does not exist
    And published assetlibrary device template "TEST-devices-linkableDevice" does not exist
