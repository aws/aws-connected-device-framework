Feature: Device Profiles

  @setup_deviceProfiles_feature
  Scenario: Setup


  Scenario: Create a new Device Template
    Given draft assetlibrary device template "TEST-deviceProfiles-type" does not exist
    And published assetlibrary device template "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device template "TEST-deviceProfiles-type" with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}} |
      | required | ["model"] |
      | relations | {"out":{"linked_to":["test-deviceProfiles-linkablegroup"]}} |
    And publish assetlibrary device template "TEST-deviceProfiles-type"
    Then published assetlibrary device template "TEST-deviceProfiles-type" exists with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}} |
      | required | ["model"] |
      | relations | {"out":{"linked_to":["test-deviceProfiles-linkablegroup"]}} |


  Scenario: Create a new Device Profile
    Given assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" with attributes
      | groups | {"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]} |
      | attributes | {"model": "abc123", "serialNumber": "S123"} |
    Then assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists with attributes
      | groups | {"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]} |
      | attributes | {"model": "abc123", "serialNumber": "S123"} |


  Scenario: Create a new Device Profile with invalid attribute fails
    Given assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" with attributes
      | groups | {"linked_to": ["/TEST-deviceProfiles-linkableGroup001"]} |
      | attributes | {"invalid_attribute": "abc123"} |
    Then it fails with a 400
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist


  Scenario: Create a new Device Profile with invalid group relation fails
    Given assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist
    When I create the assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" with attributes
      | groups | {"invalid_relation": ["/TEST-deviceProfiles-linkableGroup001"]} |
      | attributes | {"model": "abc123", "serialNumber": "S123"} |
    Then it fails with a 400
    And assetlibrary device profile "TEST-deviceProfiles-profile-invalid" of "TEST-deviceProfiles-type" does not exist


  Scenario: Create a Device with no attributes or groups, applying a profile applies all profile attributes and groups
    Given published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device001" does not exist
    When I create device "TEST-deviceProfiles-device001" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type |
    Then device "TEST-deviceProfiles-device001" exists with attributes
      | templateId | test-deviceprofiles-type |
      | groups | {"linked_to":["/test-deviceprofiles-linkablegroup001"]} |
      | attributes | {"model": "abc123", "serialNumber": "S123"} |


  Scenario: Create a Device with attributes, applying a profile appends the profile attributes and groups
    Given published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device002" does not exist
    When I create device "TEST-deviceProfiles-device002" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type |
      | attributes | {"model": "abc456"} |
    Then device "TEST-deviceProfiles-device002" exists with attributes
      | templateId | test-deviceprofiles-type |
      | groups | {"linked_to":["/test-deviceprofiles-linkablegroup001"]} |
      | attributes | {"model": "abc456", "serialNumber": "S123"} |


  Scenario: Create a Device with groups, applying a profile appends the profile attributes and groups
    Given published assetlibrary device template "TEST-deviceProfiles-type" exists
    And assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    And device "TEST-deviceProfiles-device003" does not exist
    When I create device "TEST-deviceProfiles-device003" applying profile "TEST-deviceProfiles-profile" with attributes
      | templateId | TEST-deviceProfiles-type |
      | attributes | {"model": "abc456"} |
      | groups | {"linked_to":["/test-deviceProfiles-linkablegroup002"]} |
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type |
      | groups | {"linked_to":["/test-deviceprofiles-linkablegroup002"]} |
      | attributes | {"model": "abc456", "serialNumber": "S123"} |


  Scenario: Applying a profile to an existing device appends the profiles groups and attributes
    Given device "TEST-deviceProfiles-device003" exists
    When I update device "TEST-deviceProfiles-device003" with attributes
      | attributes | {"serialNumber": null} |
    And I remove device "TEST-deviceProfiles-device003" from group "/TEST-deviceProfiles-linkableGroup002" related via "linked_to"
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type |
      | groups | ___undefined___ |
      | attributes | {"model": "abc456"} |
    When I update device "TEST-deviceProfiles-device003" applying profile "TEST-deviceProfiles-profile"
    Then device "TEST-deviceProfiles-device003" exists with attributes
      | templateId | test-deviceprofiles-type |
      | groups | ___undefined___ |
      | attributes | {"model": "abc123", "serialNumber": "S123"} |


  Scenario: Deleting a profile removes it
    Given assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" exists
    When I delete assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type"
    Then  assetlibrary device profile "TEST-deviceProfiles-profile" of "TEST-deviceProfiles-type" does not exist


  Scenario: Creating a device, applying a profile that does not exist returns not found
    Given assetlibrary device profile "TEST-deviceProfiles-profile-XXX" of "TEST-deviceProfiles-type" does not exist
    When I create device "TEST-deviceProfiles-device005" applying profile "TEST-deviceProfiles-profil-XXX" with attributes
      | templateId | TEST-deviceProfiles-type |
    Then it fails with a 400
    And device "TEST-deviceProfiles-device005" does not exist


  @teardown_deviceProfiles_feature
  Scenario: Teardown
