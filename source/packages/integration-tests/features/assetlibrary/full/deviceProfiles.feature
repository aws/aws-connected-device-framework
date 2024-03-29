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

Feature: Device Profiles

  @setup_deviceProfiles_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    And assetlibrary group template "TEST-deviceProfiles-linkableGroup" exists
    And group "/TEST-deviceProfiles-linkableGroup001" exists
    And group "/TEST-deviceProfiles-linkableGroup002" exists


  Scenario: Create a new Device Template
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-deviceProfiles-type" does not exist
    And published assetlibrary device template "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device template "TEST-deviceProfiles-type" with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"},"color":{"type":"string"}}                                                                               |
      | required   | ["model"]                                                                                                                                                                     |
      | relations  | {"out":{"linked_to":[{"name": "test-deviceProfiles-linkablegroup", "includeInAuth": true}], "backup":[{"name": "test-deviceProfiles-linkablegroup", "includeInAuth": true}]}} |
    And publish assetlibrary device template "TEST-deviceProfiles-type"
    Then published assetlibrary device template "TEST-deviceProfiles-type" exists with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"},"color":{"type":"string"}} |
      | required   | ["model"]                                                                                       |
      | relations  | {"out":{"linked_to":[{"name": "test-deviceProfiles-linkablegroup", "includeInAuth": true}]}}    |


  Scenario: Create a new Device Profile
    Given my authorization is
      | / | * |
    Given assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" with attributes
      | groups     | {"out":{"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc123", "serialNumber": "S123", "color": "magenta"}  |
    Then assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists with attributes
      | groups     | {"out":{"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc123", "serialNumber": "S123", "color": "magenta"}  |


  Scenario: Create a new Device Profile with only invalid attributes fails
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" with attributes
      | groups     | {"out":{"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"invalid_attribute": "abc123"}                                  |
    Then it fails with a 400
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist


  Scenario: Create a new Device Profile with both valid and invalid attribute fails
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" with attributes
      | groups     | {"out":{"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc123", "invalid_attribute": "abc123"}               |
    Then it fails with a 400
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist


  Scenario: Create a new Device Profile with invalid group relation fails
    Given my authorization is
      | / | * |
    Given assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" with attributes
      | groups     | {"out":{"invalid_relation": ["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc123", "serialNumber": "S123"}                             |
    Then it fails with a 400
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist


  Scenario: Create a Device with no attributes or groups, applying a profile applies all profile attributes and groups
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device001" does not exist
    When I create device "TEST-deviceProfiles-device001" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type |
    Then device "TEST-deviceProfiles-device001" exists with attributes
      | templateId | test-deviceprofiles-type                                        |
      | groups     | {"out":{"linked_to":["/test-deviceprofiles-linkablegroup001"]}} |
      | attributes | {"model": "abc123", "serialNumber": "S123", "color": "magenta"} |


  Scenario: Create a Device with attributes, applying a profile appends the profile attributes and groups
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device002" does not exist
    When I create device "TEST-deviceProfiles-device002" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type |
      | attributes | {"model": "abc456"}      |
    Then device "TEST-deviceProfiles-device002" exists with attributes
      | templateId | test-deviceprofiles-type                                        |
      | groups     | {"out":{"linked_to":["/test-deviceprofiles-linkablegroup001"]}} |
      | attributes | {"model": "abc456", "serialNumber": "S123", "color": "magenta"} |


  Scenario: Create a Device with groups, applying a profile appends the profile attributes and groups
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device003" does not exist
    When I create device "TEST-deviceProfiles-device003" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type                                                                                             |
      | attributes | {"model": "abc456", "color": "purple"}                                                                               |
      | groups     | {"out":{"linked_to":["/test-deviceProfiles-linkablegroup002"], "backup":["/test-deviceProfiles-linkablegroup003"] }} |
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type                                                                                            |
      | groups     | {"out":{"linked_to":["/test-deviceprofiles-linkablegroup002"], "backup":["/test-deviceprofiles-linkablegroup003"]}} |
      | attributes | {"model": "abc456", "serialNumber": "S123", "color": "purple"}                                                      |


  Scenario: Re-applying a profile to an existing device appends the profile's groups and attributes and overwrite existing attributes
    Given my authorization is
      | / | * |
    And device "TEST-deviceProfiles-device003" exists
    When I update device "TEST-deviceProfiles-device003" with attributes
      | attributes | {"serialNumber": null} |
    And I remove device "TEST-deviceProfiles-device003" from group "/TEST-deviceProfiles-linkableGroup002" related via "linked_to"
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type                                     |
      | groups     | {"out":{"backup":["/test-deviceprofiles-linkablegroup003"]}} |
      | attributes | {"model": "abc456", "color": "purple"}                       |
    When I update device "TEST-deviceProfiles-device003" applying profile "TEST-deviceProfiles-profile"
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type                                        |
      | groups     | {"out":{"linked_to":["/test-deviceprofiles-linkablegroup001"]}} |
      | attributes | {"model": "abc123", "serialNumber": "S123", "color": "magenta"} |


  Scenario: Update existing device profile attributes
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    When I update the assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" with attributes
      | attributes | {"model": "abc456", "serialNumber": "S456"} |
    Then assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists with attributes
      | groups     | {"out":{"linked_to":["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc456", "serialNumber": "S456", "color": "magenta"} |


  Scenario: Clear an existing device profile attribute while updating another
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    When I update the assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" with attributes
      | attributes | {"serialNumber": null, "color": "pink"} |
    Then assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists with attributes
      | groups     | {"out":{"linked_to":["/TEST-deviceProfiles-linkableGroup001"]}} |
      | attributes | {"model": "abc456", "color": "pink"}                            |


  Scenario: Deleting a profile removes it
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    When I delete assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type"
    Then  assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" does not exist


  Scenario: Creating a device, applying a profile that does not exist returns not found
    Given my authorization is
      | / | * |
    And assetlibrary device profile "TEST-deviceProfiles-profile-XXX" of "TEST-deviceProfiles-type" does not exist
    When I create device "TEST-deviceProfiles-device005" applying profile "TEST-deviceProfiles-profile-XXX" with attributes
      | templateId | TEST-deviceProfiles-type |
    Then it fails with a 404
    And device "TEST-deviceProfiles-device005" does not exist


  @teardown_deviceProfiles_feature
  Scenario: Teardown
    Given my authorization is
      | / | * |
    And assetlibrary group template "TEST-deviceProfiles-linkableGroup" does not exist
    And group "/TEST-deviceProfiles-linkableGroup001" does not exist
    And group "/TEST-deviceProfiles-linkableGroup002" does not exist
    And draft assetlibrary device template "TEST-deviceProfiles-type" does not exist
    And published assetlibrary device template "TEST-deviceProfiles-type" does not exist
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" does not exist
    And device "TEST-deviceProfiles-device001" does not exist
    And device "TEST-deviceProfiles-device002" does not exist
    And device "TEST-deviceProfiles-device003" does not exist
