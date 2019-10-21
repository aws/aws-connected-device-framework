Feature: Groups Profiles

  @setup_groupProfiles_feature
  Scenario: Setup


  Scenario: Create a new Group Template
    Given draft assetlibrary group template "TEST-groupProfiles-type" does not exist
    And published assetlibrary group template "TEST-groupProfiles-type" does not exist
    When I create the assetlibrary group template "TEST-groupProfiles-type" with attributes
      | properties | {"site":{"type":["string","null"]},"area":{"type":["string","null"]}} |
      | required | ["site"] |
    And publish assetlibrary group template "TEST-groupProfiles-type"
    Then published assetlibrary group template "TEST-groupProfiles-type" exists with attributes
      | properties | {"site":{"type":["string","null"]},"area":{"type":["string","null"]}} |
      | required | ["site"] |


  Scenario: Create a new Group Profile
    Given assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" does not exist
    When I create the assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" with attributes
      | attributes | {"site": "A", "area": "1"} |
    Then assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" exists with attributes
      | attributes | {"site": "A", "area": "1"} |


  Scenario: Create a new Group Profile with invalid attribute fails
    Given assetlibrary group profile "TEST-groupProfiles-profile-invalid" of "TEST-groupProfiles-type" does not exist
    When I create the assetlibrary group profile "TEST-groupProfiles-profile-invalid" of "TEST-groupProfiles-type" with attributes
      | attributes | {"invalid_attribute": "abc123"} |
    Then it fails with a 400
    And assetlibrary group profile "TEST-groupProfiles-profile-invalid" of "TEST-groupProfiles-type" does not exist


  Scenario: Create a Group with no attributes, applying a profile applies all profile attributes
    Given published assetlibrary group template "TEST-groupProfiles-type" exists
    And assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" exists
    And group "TEST-groupProfiles-group001" does not exist
    When I create group "TEST-groupProfiles-group001" of "/" applying profile "TEST-groupProfiles-profile" with attributes
      | templateId | TEST-groupProfiles-type |
    Then group "/TEST-groupProfiles-group001" exists with attributes
      | templateId | test-groupprofiles-type |
      | attributes | {"site": "A", "area": "1"} |


  Scenario: Create a Group with attributes, applying a profile appends the profile attributes
    Given published assetlibrary group template "TEST-groupProfiles-type" exists
    And assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" exists
    And group "/TEST-groupProfiles-group002" does not exist
    When I create group "TEST-groupProfiles-group002" of "/" applying profile "TEST-groupProfiles-profile" with attributes
      | templateId | TEST-groupProfiles-type |
      | attributes | {"area": "2"} |
    Then group "/TEST-groupProfiles-group002" exists with attributes
      | templateId | test-groupprofiles-type |
      | attributes | {"site": "A", "area": "2"} |


  Scenario: Applying a profile to an existing group appends the profiles attributes
    Given group "/TEST-groupProfiles-group002" exists
    When I update group "/TEST-groupProfiles-group002" with attributes
      | attributes | {"site":"B", "area": null } |
    Then group "/TEST-groupProfiles-group002" exists with attributes
      | templateId | test-groupprofiles-type |
      | attributes | {"site": "B"} |
    When I update group "/TEST-groupProfiles-group002" applying profile "TEST-groupProfiles-profile"
    Then group "/TEST-groupProfiles-group002" exists with attributes
      | templateId | test-groupprofiles-type |
      | attributes | {"site": "A", "area": "1"} |


  Scenario: Deleting a profile removes it
    Given assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" exists
    When I delete assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type"
    Then  assetlibrary group profile "TEST-groupProfiles-profile" of "TEST-groupProfiles-type" does not exist


  Scenario: Creating a group, applying a profile that does not exist returns not found
    Given assetlibrary group profile "TEST-groupProfiles-profile-XXX" of "TEST-groupProfiles-type" does not exist
    When I create group "/TEST-groupProfiles-group005" of "/" applying profile "TEST-groupProfiles-profile-XXX" with attributes
      | templateId | TEST-groupProfiles-type |
    Then it fails with a 400
    And group "/TEST-groupProfiles-group005" does not exist


  @teardown_groupProfiles_feature
  Scenario: Teardown
