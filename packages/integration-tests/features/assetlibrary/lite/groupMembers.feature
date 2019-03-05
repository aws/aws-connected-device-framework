Feature: Group Members

  @setup_groupMembers_lite_feature
  Scenario: Setup
    Given assetlibrary device template "TEST-groupMembers-deviceTypeA-012" exists
    And assetlibrary device template "TEST-groupMembers-deviceTypeB-012" exists

  Scenario: A Device can be added to a group
    When I create group "TEST-groupMembers-parent" of "" with attributes
      | attributes | {} |
    And I create device "TEST-groupMembers-device001" with attributes
      | templateId | TEST-groupMembers-deviceTypeA-012 |
      | groups | {"group":["TEST-groupMembers-parent"]} |
      | attributes | {} |
    Then group "TEST-groupMembers-parent" exists
    And device "TEST-groupMembers-device001" exists
    And device "TEST-groupMembers-device001" is "group" "TEST-groupMembers-parent"


  Scenario: Multiple devices can be added to a group
    When I create device "TEST-groupMembers-device002" with attributes
      | templateId | TEST-groupMembers-deviceTypeB-012 |
      | groups | {"group":["TEST-groupMembers-parent"]} |
      | attributes | {} |
    And I create device "TEST-groupMembers-device003" with attributes
      | templateId | TEST-groupMembers-deviceTypeB-012 |
      | groups | {"group":["TEST-groupMembers-parent"]} |
      | attributes | {} |
    Then device "TEST-groupMembers-device002" exists
    And device "TEST-groupMembers-device002" is "group" "TEST-groupMembers-parent"
    And device "TEST-groupMembers-device003" exists
    And device "TEST-groupMembers-device003" is "group" "TEST-groupMembers-parent"

  
  Scenario: Child groups can be added to the parent
    When I create group "child1" of "TEST-groupMembers-parent" with attributes
      | attributes | {} |
    And I create group "child2" of "TEST-groupMembers-parent" with attributes
      | attributes | {} |
    Then group "child1" exists
    And group "child2" exists


  Scenario:  Group members are returned
    When I retrieve "" group members of "TEST-groupMembers-parent"
    Then group contains 2 groups
    And group contains group "child1"
    And group contains group "child2"


  Scenario: Device members are returned
    When I retrieve "" device members of "TEST-groupMembers-parent"
    Then group contains 3 devices
    And group contains device "TEST-groupMembers-device001"
    And group contains device "TEST-groupMembers-device002"
    And group contains device "TEST-groupMembers-device003"


  @teardown_groupMembers_lite_feature
  Scenario: Teardown
    Given group "testGroup001" does not exist
    And device "TEST-groupMembers-device001" does not exist
    And device "TEST-groupMembers-device002" does not exist
    And device "TEST-groupMembers-device003" does not exist
    And assetlibrary device template "TEST-groupMembers-deviceTypeA-012" exists with attributes
      | status | deprecated |
    And assetlibrary device template "TEST-groupMembers-deviceTypeB-012" exists with attributes
      | status | deprecated |
