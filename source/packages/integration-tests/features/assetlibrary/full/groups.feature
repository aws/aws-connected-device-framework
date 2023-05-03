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

Feature: Group lifecycle

  @setup_groups_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    Given group "/TEST-groups-group001" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist

  Scenario: Create a new group Template
    Given my authorization is
      | / | * |
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    When I create and publish the root authorized assetlibrary group template "TEST-groups-groupTemplate001" with attributes
      | properties | {"color":{"type":["string","null"]},"size":{"type":"string"}} |
      | required   | ["size"]                                                      |
    Then published assetlibrary group template "TEST-groups-groupTemplate001" exists with attributes
      | properties | {"color":{"type":["string","null"]},"size":{"type":"string"}} |
      | required   | ["size"]                                                      |

  Scenario: Create another new group Template
    Given my authorization is
      | / | * |
    And draft assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    When I create and publish the root authorized assetlibrary group template "TEST-groups-groupTemplate002" with attributes
      | relations | {"out": {"parent": [{"name":"root", "includeInAuth": true}], "belongs_to": [{"name":"TEST-groups-groupTemplate001", "includeInAuth": true}], "relates_to": [{"name": "TEST-groups-groupTemplate001", "includeInAuth": true}]}} |
    Then published assetlibrary group template "TEST-groups-groupTemplate002" exists with attributes
      | relations | {"out": {"parent": [{"name":"root", "includeInAuth": true}], "belongs_to": [{"name":"TEST-groups-groupTemplate001", "includeInAuth": true}], "relates_to": [{"name": "TEST-groups-groupTemplate001", "includeInAuth": true}]}} |

  Scenario: Create a new Device Template
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-devices-type" does not exist
    And published assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}}                                                                                              |
      | required   | ["model"]                                                                                                                                                          |
      | relations  | {"out":{"to_group":[{"name": "test-groups-grouptemplate001", "includeInAuth": true}], "backup":[{"name": "test-groups-grouptemplate001", "includeInAuth": true}]}} |
    And publish assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" exists with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}}                                                                                              |
      | required   | ["model"]                                                                                                                                                          |
      | relations  | {"out":{"to_group":[{"name": "test-groups-grouptemplate001", "includeInAuth": true}], "backup":[{"name": "test-groups-grouptemplate001", "includeInAuth": true}]}} |

  Scenario: Create a group with valid attributes
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" does not exist
    When I create group "TEST-groups-group001" of "/" with attributes
      | templateId  | test-groups-grouptemplate001 |
      | description | My group                     |
      | attributes  | {"color":"black","size":"S"} |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId  | test-groups-grouptemplate001 |
      | name        | TEST-groups-group001         |
      | description | My group                     |
      | parentPath  | /                            |
      | attributes  | {"color":"black","size":"S"} |

  Scenario: Linking a group during creation using a defined relation is successful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate002" exists
    When I create group "TEST-groups-group002" of "/" with attributes
      | templateId  | TEST-groups-groupTemplate002                     |
      | description | My second group                                  |
      | attributes  | {}                                               |
      | groups      | {"out":{"belongs_to":["/test-groups-group001"]}} |
    Then group "/TEST-groups-group002" exists with attributes
      | templateId  | test-groups-grouptemplate002                     |
      | name        | TEST-groups-group002                             |
      | description | My second group                                  |
      | attributes  | {}                                               |
      | parentPath  | /                                                |
      | groups      | {"out":{"belongs_to":["/test-groups-group001"]}} |

  Scenario: Linking a group during creation using a defined relation but unsupported type is unsuccessful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group002" exists
    When I create group "TEST-groups-group004" of "/" with attributes
      | templateId  | test-groups-grouptemplate002                     |
      | description | My second group                                  |
      | attributes  | {}                                               |
      | groups      | {"out":{"belongs_to":["/test-groups-group002"]}} |
    Then it fails with a 400
    And group "/TEST-groups-group004" does not exist

  Scenario: Linking a group during creation using an undefined relation is unsuccessful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group002" exists
    When I create group "TEST-groups-group004" of "/" with attributes
      | templateId  | test-groups-grouptemplate002                    |
      | description | My second group                                 |
      | attributes  | {}                                              |
      | groups      | {"out":{"linked_to":["/test-groups-group001"]}} |
    Then it fails with a 400
    And group "/TEST-groups-group004" does not exist

  Scenario: Unlinking a group is successful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I detatch group "/TEST-groups-group002" from group "/TEST-groups-group001" via "belongs_to"
    Then group "/TEST-groups-group002" exists with attributes
      | templateId  | test-groups-grouptemplate002 |
      | name        | TEST-groups-group002         |
      | description | My second group              |
      | attributes  | {}                           |
      | parentPath  | /                            |
      | groups      | {}                           |

  Scenario: Relinking a group is successful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I attach group "/TEST-groups-group002" to group "/TEST-groups-group001" via "belongs_to"
    Then group "/TEST-groups-group002" exists with attributes
      | templateId  | test-groups-grouptemplate002                     |
      | name        | TEST-groups-group002                             |
      | description | My second group                                  |
      | attributes  | {}                                               |
      | parentPath  | /                                                |
      | groups      | {"out":{"belongs_to":["/test-groups-group001"]}} |

  Scenario: Linking a group with defined relation but unsupported type is unsuccessful
    Given my authorization is
      | / | * |
    Given group "/TEST-groups-group001" exists
    And group "/TEST-groups-group002" exists
    When I attach group "/TEST-groups-group002" to group "/TEST-groups-group001" via "linked_to"
    Then it fails with a 400

  Scenario: Create a group with missing required attributes fails
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group003" does not exist
    When I create group "TEST-groups-group003" of "/" with invalid attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":"black"}            |
    Then it fails with a 400
    And group "/TEST-groups-group003" does not exist

  Scenario: Update existing groups attributes
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"size":"M"}                 |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId  | test-groups-grouptemplate001                    |
      | name        | TEST-groups-group001                            |
      | description | My group                                        |
      | parentPath  | /                                               |
      | attributes  | {"color":"black","size":"M"}                    |
      | groups      | {"in":{"belongs_to":["/test-groups-group002"]}} |

  Scenario: Clear existing custom group attributes
    Given my authorization is
      | / | * |
    Given group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":null}               |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId  | test-groups-grouptemplate001 |
      | name        | TEST-groups-group001         |
      | description | My group                     |
      | parentPath  | /                            |
      | attributes  | {"size":"M"}                 |

  # Covers https://github.com/aws/aws-connected-device-framework/issues/64
  Scenario: Clear existing custom group attributes while updating others
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":null,"size":"L"}    |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId  | test-groups-grouptemplate001 |
      | name        | TEST-groups-group001         |
      | description | My group                     |
      | parentPath  | /                            |
      | attributes  | {"size":"L"}                 |

  Scenario: Clear existing top level group attribute
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId  | test-groups-grouptemplate001 |
      | description | ___null___                   |
    Then group "/TEST-groups-group001" exists with attributes
      | templateId  | test-groups-grouptemplate001 |
      | name        | TEST-groups-group001         |
      | description | ___undefined___              |
      | parentPath  | /                            |
      | attributes  | {"size":"L"}                 |

  Scenario: Linking a group during update using a defined relation is successful
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And published assetlibrary group template "TEST-groups-groupTemplate002" exists
    And group "/TEST-groups-group005" does not exist
    And group "/TEST-groups-group006" does not exist
    When I create group "TEST-groups-group005" of "/" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"size":"L"}                 |
    When I create group "TEST-groups-group006" of "/" with attributes
      | templateId | test-groups-grouptemplate002                                                             |
      | attributes | {}                                                                                       |
      | groups     | {"out":{"belongs_to":["/test-groups-group001"], "relates_to":["/test-groups-group001"]}} |
    When I update group "/TEST-groups-group006" with attributes
      | groups | {"out":{"belongs_to":["/test-groups-group005"], "relates_to":["/test-groups-group005"]}} |
    Then group "/TEST-groups-group006" exists with attributes
      | templateId | test-groups-grouptemplate002                                                             |
      | name       | TEST-groups-group006                                                                     |
      | attributes | {}                                                                                       |
      | parentPath | /                                                                                        |
      | groups     | {"out":{"belongs_to":["/test-groups-group005"], "relates_to":["/test-groups-group005"]}} |
    Then group "/TEST-groups-group005" exists with attributes
      | groups | {"in":{"belongs_to":["/test-groups-group006"], "relates_to":["/test-groups-group006"]}} |
    When I update group "/TEST-groups-group005" with attributes
      | groups | {"in":{"belongs_to":["/test-groups-group006"]}} |
    Then group "/TEST-groups-group005" exists with attributes
      | groups | {"in":{"belongs_to":["/test-groups-group006"]}} |
    Then group "/TEST-groups-group006" exists with attributes
      | groups | {"out":{"belongs_to":["/test-groups-group005"]}} |

  Scenario: Create device, link to a group, then modify the group's existng relationships to groups, should not impact device relationships
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices-type" exists
    And group "/TEST-groups-group005" exists
    When I create device "TEST-devices-device001" with attributes
      | templateId     | TEST-devices-type                                                                   |
      | description    | My description                                                                      |
      | awsIotThingArn | arn:aws:iot:us-east-1:xxxxxxxxxxxx:thing/test-devices-device001                     |
      | state          | active                                                                              |
      | groups         | {"out":{"to_group":["/test-groups-group005"], "backup": ["/test-groups-group001"]}} |
      | attributes     | {"serialNumber":"S001","model":"A"}                                                 |
    Then device "TEST-devices-device001" exists with attributes
      | groups | {"out":{"backup": ["/test-groups-group001"], "to_group":["/test-groups-group005"]}} |
    When I update group "/TEST-groups-group005" with attributes
      | groups | {"in":{}} |
    Then group "/TEST-groups-group005" exists with attributes
      | groups | {} |
    Then device "TEST-devices-device001" exists with attributes
      | groups | {"out":{"backup": ["/test-groups-group001"], "to_group":["/test-groups-group005"]}} |

  Scenario: Linking a group during update using a defined relation but unsupported type is unsuccessful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group005" exists
    And group "/TEST-groups-group006" exists
    When I update group "/TEST-groups-group005" with attributes
      | groups | {"out":{"belongs_to":["/test-groups-group006"]}} |
    Then it fails with a 400

  Scenario: Linking a group during update using an undefined relation is unsuccessful
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group005" exists
    And group "/TEST-groups-group006" exists
    When I update group "/TEST-groups-group006" with attributes
      | groups | {"out":{"linked_to":["/test-groups-group005"]}} |
    Then it fails with a 400

  Scenario: Delete the groups
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group005" exists
    And group "/TEST-groups-group006" exists
    When I delete group "/TEST-groups-group005"
    When I delete group "/TEST-groups-group006"
    Then group "/TEST-groups-group005" does not exist
    And group "/TEST-groups-group006" does not exist

  Scenario: Group paths are unique
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I create group "TEST-groups-group001" of "/" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"color":"black","size":"S"} |
    Then it fails with a 409

  Scenario: Retrieving a group that does not exist
    Given my authorization is
      | / | * |
    And group "/TEST-groups-groupXXX" does not exist
    When I get group "/TEST-groups-groupXXX"
    Then it fails with a 404

  Scenario: Should not be able to clear existing groups required attributes
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I update group "/TEST-groups-group001" with attributes
      | templateId | test-groups-grouptemplate001 |
      | attributes | {"size":null}                |
    Then it fails with a 400

  Scenario: Should not be able to delete a template when groups still exist
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" exists
    When I delete assetlibrary group template "TEST-groups-groupTemplate001"
    Then it fails with a 409
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists

  Scenario: Teardown device artifacts
    Given my authorization is
      | / | * |
    When I delete device "TEST-devices-device001"
    Then device "TEST-devices-device001" does not exist
    Given published assetlibrary device template "TEST-devices-type" exists
    When I delete assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" does not exist

  Scenario: Delete the group
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" exists
    When I delete group "/TEST-groups-group001"
    Then group "/TEST-groups-group001" does not exist

  Scenario: Should be able to delete a template when no groups exist
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-groups-groupTemplate001" exists
    And group "/TEST-groups-group001" does not exist
    When I delete assetlibrary group template "TEST-groups-groupTemplate001"
    Then published assetlibrary group template "TEST-groups-groupTemplate001" does not exist

  @teardown_groups_feature
  Scenario: Teardown
    Given my authorization is
      | / | * |
    And group "/TEST-groups-group001" does not exist
    And group "/TEST-groups-group002" does not exist
    And group "/TEST-groups-group003" does not exist
    And group "/TEST-groups-group004" does not exist
    And group "/TEST-groups-group005" does not exist
    And group "/TEST-groups-group006" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate001" does not exist
    And draft assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    And published assetlibrary group template "TEST-groups-groupTemplate002" does not exist
    And draft assetlibrary device template "TEST-devices-type" does not exist
    And published assetlibrary device template "TEST-devices-type" does not exist
