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

Feature: Deleting associated devices and groups from devices

  Tests related to deleting groups and devices associated with a device.

  @setup_devices2_feature
  Scenario: SETUP: create group template
    Setting up of a group template used for testing.
    Given my authorization is
      | / | * |
    Then published assetlibrary group template "TEST-devices2-groupTemplate001" exists

  Scenario: SETUP: create device template 1
    Setting up of a device template used for testing.
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-devices2-deviceTemplate001" does not exist
    And published assetlibrary device template "TEST-devices2-deviceTemplate001" does not exist
    When I create the assetlibrary device template "TEST-devices2-deviceTemplate001" with attributes
      | properties | {}                                                                                                                                                                                                                                            |
      | relations  | {"out":{"link1":[{"name": "test-devices2-groupTemplate001", "includeInAuth": true}],"link2":[{"name": "test-devices2-groupTemplate001", "includeInAuth": true}],"link3":[{"name": "test-devices2-groupTemplate001", "includeInAuth": true}]}} |
    And publish assetlibrary device template "TEST-devices2-deviceTemplate001"
    Then published assetlibrary device template "TEST-devices2-deviceTemplate001" exists with attributes
      | $.relations.out.length | 3                                  |
      | $.relations.out.link1  | ["test-devices2-grouptemplate001"] |
      | $.relations.out.link2  | ["test-devices2-grouptemplate001"] |
      | $.relations.out.link3  | ["test-devices2-grouptemplate001"] |

  Scenario: SETUP: create device template 2
    Setting up of a device template used for testing.
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-devices2-deviceTemplate002" does not exist
    And published assetlibrary device template "TEST-devices2-deviceTemplate002" does not exist
    When I create the assetlibrary device template "TEST-devices2-deviceTemplate002" with attributes
      | properties | {}                                                                                                                                                                                                                                                        |
      | relations  | {"in":{"link4":[{"name": "test-devices2-deviceTemplate001", "includeInAuth": true}], "link5":[{"name": "test-devices2-deviceTemplate001", "includeInAuth": true}]}, "out":{"parent":[{"name": "test-devices2-groupTemplate001", "includeInAuth": true}]}} |
    And publish assetlibrary device template "TEST-devices2-deviceTemplate002"
    Then published assetlibrary device template "TEST-devices2-deviceTemplate002" exists with attributes
      | $.relations.in.length | 2                                   |
      | $.relations.in.link4  | ["test-devices2-devicetemplate001"] |
      | $.relations.in.link5  | ["test-devices2-devicetemplate001"] |

  Scenario: SETUP: create group 1
    Setting up of a group `/TEST-devices2-group001` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group001" does not exist
    When I create group "TEST-devices2-group001" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group001" exists

  Scenario: SETUP: create group 2
    Setting up of a group `/TEST-devices2-group002` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group002" does not exist
    When I create group "TEST-devices2-group002" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group002" exists

  Scenario: SETUP: create group 3
    Setting up of a group `/TEST-devices2-group003` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group003" does not exist
    When I create group "TEST-devices2-group003" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group003" exists

  Scenario: SETUP: create group 4
    Setting up of a group `/TEST-devices2-group004` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group004" does not exist
    When I create group "TEST-devices2-group004" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group004" exists

  Scenario: SETUP: create group 5
    Setting up of a group `/TEST-devices2-group005` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group005" does not exist
    When I create group "TEST-devices2-group005" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group005" exists

  Scenario: SETUP: create group 6
    Setting up of a group `/TEST-devices2-group006` used for testing.
    Given my authorization is
      | / | * |
    And published assetlibrary group template "TEST-devices2-groupTemplate001" exists
    And group "/TEST-devices2-group006" does not exist
    When I create group "TEST-devices2-group006" of "/" with attributes
      | templateId | test-devices2-grouptemplate001 |
    Then group "/TEST-devices2-group006" exists

  Scenario: SETUP: create device 1
    Setting up of a device used for testing which is associated with the 6 groups created in the previous scenarios.
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices2-deviceTemplate001" exists
    And device "TEST-devices2-device001" does not exist
    When I create device "TEST-devices2-device001" with attributes
      | templateId | TEST-devices2-deviceTemplate001                                                                                                                                                                       |
      | groups     | {"out":{"link1":["/TEST-devices2-group001","/TEST-devices2-group002"], "link2":["/TEST-devices2-group003","/TEST-devices2-group004"], "link3":["/TEST-devices2-group005","/TEST-devices2-group006"]}} |
    Then device "TEST-devices2-device001" exists with attributes
      | $.groups.out.link1 | ___deepEqualInAnyOrder___ ["/test-devices2-group001", "/test-devices2-group002"] |
      | $.groups.out.link2 | ___deepEqualInAnyOrder___ ["/test-devices2-group003", "/test-devices2-group004"] |
      | $.groups.out.link3 | ___deepEqualInAnyOrder___ ["/test-devices2-group005", "/test-devices2-group006"] |

  Scenario: SETUP: create device 2
    Setting up of a second device used for testing which is associated with the device created in the previous scenario.
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices2-deviceTemplate002" exists
    And device "TEST-devices2-device002" does not exist
    When I create device "TEST-devices2-device002" with attributes
      | templateId | TEST-devices2-deviceTemplate002                |
      | devices    | {"in":{"link4":["TEST-devices2-device001"]}}   |
      | groups     | {"out":{"parent":["/TEST-devices2-group001"]}} |

    Then device "TEST-devices2-device002" exists with attributes
      | devices | {"in":{"link4":["test-devices2-device001"]}} |

  Scenario: SETUP: create device 3
    Setting up of a second device used for testing which is associated with the device created in the previous scenario.
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices2-deviceTemplate002" exists
    And device "TEST-devices2-device003" does not exist
    When I create device "TEST-devices2-device003" with attributes
      | templateId | TEST-devices2-deviceTemplate002                |
      | devices    | {"in":{"link4":["TEST-devices2-device001"]}}   |
      | groups     | {"out":{"parent":["/TEST-devices2-group001"]}} |
    Then device "TEST-devices2-device003" exists with attributes
      | devices | {"in":{"link4":["test-devices2-device001"]}} |

  Scenario: SETUP: create device 4
    Setting up of a second device used for testing which is associated with the devices created in the previous scenario.
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices2-deviceTemplate002" exists
    And device "TEST-devices2-device004" does not exist
    When I create device "TEST-devices2-device004" with attributes
      | templateId | TEST-devices2-deviceTemplate002                |
      | devices    | {"in":{"link5":["TEST-devices2-device001"]}}   |
      | groups     | {"out":{"parent":["/TEST-devices2-group001"]}} |
    Then device "TEST-devices2-device004" exists with attributes
      | devices | {"in":{"link5":["test-devices2-device001"]}} |

  Scenario: SETUP: create device 5
    Setting up of a second device used for testing which is associated with the devices created in the previous scenario.
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-devices2-deviceTemplate002" exists
    And device "TEST-devices2-device005" does not exist
    When I create device "TEST-devices2-device005" with attributes
      | templateId | TEST-devices2-deviceTemplate002                |
      | devices    | {"in":{"link5":["TEST-devices2-device001"]}}   |
      | groups     | {"out":{"parent":["/TEST-devices2-group001"]}} |
    Then device "TEST-devices2-device005" exists with attributes
      | devices | {"in":{"link5":["test-devices2-device001"]}} |

  Scenario: Deassociating all groups of the same association
    Given my authorization is
      | / | * |
    Given device "TEST-devices2-device001" exists
    When I remove device "TEST-devices2-device001" from groups related via "link1"
    Then device "TEST-devices2-device001" exists with attributes
      | $.groups.out.link1  | ___undefined___                                                                  |
      | $.groups.out.link2  | ___deepEqualInAnyOrder___ ["/test-devices2-group003", "/test-devices2-group004"] |
      | $.groups.out.link3  | ___deepEqualInAnyOrder___ ["/test-devices2-group005", "/test-devices2-group006"] |
      | $.devices.out.link4 | ___deepEqualInAnyOrder___ ["test-devices2-device002", "test-devices2-device003"] |
      | $.devices.out.link5 | ___deepEqualInAnyOrder___ ["test-devices2-device004", "test-devices2-device005"] |

  Scenario: Deassociating all associated groups
    Given my authorization is
      | / | * |
    And device "TEST-devices2-device001" exists
    When I remove device "TEST-devices2-device001" from all groups
    Then device "TEST-devices2-device001" exists with attributes
      | groups              | {}                                                                               |
      | $.devices.out.link4 | ___deepEqualInAnyOrder___ ["test-devices2-device002", "test-devices2-device003"] |
      | $.devices.out.link5 | ___deepEqualInAnyOrder___ ["test-devices2-device004", "test-devices2-device005"] |

  Scenario: Deassociating all devices of the same association
    Given my authorization is
      | / | * |
    And device "TEST-devices2-device001" exists
    When I remove device "TEST-devices2-device001" from devices related via "link4"
    Then device "TEST-devices2-device001" exists with attributes
      | $.devices.out.link4 | ___undefined___                                                                  |
      | $.devices.out.link5 | ___deepEqualInAnyOrder___ ["test-devices2-device004", "test-devices2-device005"] |

  Scenario: Deassociating all devices
    Given my authorization is
      | / | * |
    And device "TEST-devices2-device001" exists
    # It is necessary to re-attach a group that has root-level auth access,
    # or the device will become inaccessible with [/:*] permissions and fail to delete on Teardown
    When I update device "TEST-devices2-device001" with attributes
      | groups | {"out":{"link1":["/TEST-devices2-group001"]}} |
    And I remove device "TEST-devices2-device001" from all devices
    Then device "TEST-devices2-device001" exists with attributes
      | devices | {} |

  Scenario: TEARDOWN: remove all devices, groups, and templates, that were created as part of this
    Ensures all the test resources have been removed
    Given my authorization is
      | / | * |
    Given I delete device "TEST-devices2-device001"
    And I delete device "TEST-devices2-device002"
    And I delete device "TEST-devices2-device003"
    And I delete device "TEST-devices2-device004"
    And I delete device "TEST-devices2-device005"
    And I delete group "/test-devices2-group001"
    And I delete group "/test-devices2-group002"
    And I delete group "/test-devices2-group003"
    And I delete group "/test-devices2-group004"
    And I delete group "/test-devices2-group005"
    And I delete group "/test-devices2-group006"
    And I delete assetlibrary device template "TEST-devices2-deviceTemplate002"
    And I delete assetlibrary device template "TEST-devices2-deviceTemplate001"
    And I delete assetlibrary group template "TEST-devices2-groupTemplate001"
    Then device "TEST-devices2-device001" does not exist
    And device "TEST-devices2-device002" does not exist
    And device "TEST-devices2-device003" does not exist
    And device "TEST-devices2-device004" does not exist
    And device "TEST-devices2-device005" does not exist
    And group "/test-devices2-group001" does not exist
    And group "/test-devices2-group002" does not exist
    And group "/test-devices2-group003" does not exist
    And group "/test-devices2-group004" does not exist
    And group "/test-devices2-group005" does not exist
    And group "/test-devices2-group006" does not exist
    And assetlibrary device template "TEST-devices2-deviceTemplate001" does not exist
    And assetlibrary device template "TEST-devices2-deviceTemplate002" does not exist
    And assetlibrary group template "TEST-devices2-groupTemplate001" does not exist
