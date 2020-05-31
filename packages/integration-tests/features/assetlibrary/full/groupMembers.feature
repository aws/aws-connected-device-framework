Feature: Group Members

  @setup_groupMembers_feature
  Scenario: Setup
    Given published assetlibrary group template "TEST-groupMembers-group" exists
    And published assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupA" exists
    And published assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupB" exists
    And published assetlibrary device template "TEST-groupMembers-deviceNotLinkableToGroup" exists


  Scenario: A Device can be added to a group
    When I create group "TEST-groupMembers-parent" of "/" with attributes
      | templateId | TEST-groupMembers-group |
      | attributes | {} |
    And I create device "TEST-groupMembers-device001" with attributes
      | templateId | TEST-groupMembers-deviceLinkableToGroupA |
      | groups | {"located_at":["/TEST-groupMembers-parent"]} |
      | state | active |
      | attributes | {} |
    Then group "/TEST-groupMembers-parent" exists
    And device "TEST-groupMembers-device001" exists
    And device "TEST-groupMembers-device001" is "located_at" "/test-groupmembers-parent"


  Scenario: A Device cannot have duplicated relations to the same group
    Given device "TEST-groupMembers-device001" is "located_at" "/test-groupmembers-parent"
    When I add device "TEST-groupMembers-device001" to group "/test-groupmembers-parent" related via "located_at"
    Then device "TEST-groupMembers-device001" exists with attributes
      | groups | {"located_at":["/test-groupmembers-parent"]} |


  Scenario: Multiple devices can be added to a group
    When I create device "TEST-groupMembers-device002" with attributes
      | templateId | TEST-groupMembers-deviceLinkableToGroupB |
      | groups | {"located_at":["/TEST-groupMembers-parent"]} |
      | state | active |
      | attributes | {} |
    And I create device "TEST-groupMembers-device003" with attributes
      | templateId | test-groupmembers-devicelinkabletogroupb |
      | groups | {"located_at":["/test-groupmembers-parent"]} |
      | attributes | {} |
    Then device "TEST-groupMembers-device002" exists
    And device "TEST-groupMembers-device002" is "located_at" "/test-groupmembers-parent"
    And device "TEST-groupMembers-device003" exists
    And device "TEST-groupMembers-device003" is "located_at" "/test-groupmembers-parent"


  Scenario: Child groups can be added to the parent
    When I create group "child1" of "/TEST-groupMembers-parent" with attributes
      | templateId | TEST-groupMembers-group |
      | attributes | {} |
    And I create group "child2" of "/TEST-groupMembers-parent" with attributes
      | templateId | test-groupmembers-group |
      | attributes | {} |
    Then group "/TEST-groupMembers-parent/child1" exists
    And group "/TEST-groupMembers-parent/child2" exists


  Scenario:  Group members are returned
    When I retrieve "TEST-groupMembers-group" group members of "/TEST-groupMembers-parent"
    Then group contains 2 groups
    And group contains group "/test-groupmembers-parent/child1"
    And group contains group "/test-groupmembers-parent/child2"


  Scenario:  Active device members are returned
    When I retrieve "TEST-groupMembers-deviceLinkableToGroupB" device members of "/TEST-groupMembers-parent"
    Then group contains 1 devices
    And group contains device "test-groupmembers-device002"


  @teardown_groupMembers_feature
  Scenario: Teardown
    Given group "/testGroup001" does not exist
    And device "TEST-groupMembers-device001" does not exist
    And device "TEST-groupMembers-device002" does not exist
    And device "TEST-groupMembers-device003" does not exist
    And draft assetlibrary group template "testGroup" does not exist
    And published assetlibrary group template "testGroup" does not exist
    And draft assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupA" does not exist
    And published assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupA" does not exist
    And draft assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupB" does not exist
    And published assetlibrary device template "TEST-groupMembers-deviceLinkableToGroupB" does not exist
    And draft assetlibrary device template "TEST-groupMembers-deviceNotLinkableToGroup" does not exist
    And published assetlibrary device template "TEST-groupMembers-deviceNotLinkableToGroup" does not exist

