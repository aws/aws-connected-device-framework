Feature: Device lifecycle

  @setup_devices_feature
  Scenario: Setup
    Given group "/TEST-devices-linkableGroup001" exists
    And group "/TEST-devices-unlinkableGroup001" exists


  Scenario: Create a new Device Template
    Given draft assetlibrary device template "TEST-devices-type" does not exist
    And published assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}} |
      | required | ["model"] |
      | relations | {"out":{"linked_to":["test-devices-linkablegroup"],"parent":["test-devices-linkablegroup"]}} |
    And publish assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" exists with attributes
      | properties | {"serialNumber":{"type":["string","null"]},"model":{"type":"string"}} |
      | required | ["model"] |
      | relations | {"out":{"linked_to":["test-devices-linkablegroup"],"parent":["test-devices-linkablegroup"]}} |


  Scenario: Create a Device with valid attributes
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" does not exist
    When I create device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | description | My description |
      | awsIotThingArn | arn:aws:iot:us-east-1:123456789012:thing/test-devices-device001 |
      | state | active |
      | groups | {"linked_to":["/test-devices-linkablegroup001"]} |
      | attributes | {"serialNumber":"S001","model":"A"} |
    Then device "TEST-devices-device001" exists with attributes
      | templateId | test-devices-type |
      | description | My description |
      | awsIotThingArn | arn:aws:iot:us-east-1:123456789012:thing/test-devices-device001 |
      | state | active |
      | groups | {"linked_to":["/test-devices-linkablegroup001"]} |
      | attributes | {"serialNumber":"S001","model":"A"} |


  Scenario: Create a Device with missing required custom attributes fails
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device002" does not exist
    When I create device "TEST-devices-device002" with invalid attributes
      | templateId | TEST-devices-type |
      | attributes | {"serialNumber":"S001"} |
    Then it fails with a 400
    And device "TEST-devices-device002" does not exist


  Scenario: Create a Device with no state or parent applies the defaults
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device003" does not exist
    When I create device "TEST-devices-device003" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"serialNumber":"S001","model":"A"} |
    Then device "TEST-devices-device003" exists with attributes
      | templateId | test-devices-type |
      | state | unprovisioned |
      | groups | {"parent":["/unprovisioned"]} |
      | attributes | {"serialNumber":"S001","model":"A"} |


  Scenario: Create a Device attempting to associate with an unlinkable group fails
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device004" does not exist
    When I create device "TEST-devices-device004" with invalid attributes
      | templateId | TEST-devices-type |
      | state | active |
      | groups | {"linked_to":["/test-devices-unlinkablegroup001"]} |
      | attributes | {"serialNumber":"S001","model":"A"} |
    Then it fails with a 400
    And device "TEST-devices-device004" does not exist


  Scenario: Update existing device attributes
    Given device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":"B"} |
    Then device "TEST-devices-device001" exists with attributes
      | description | My description |
      | awsIotThingArn | arn:aws:iot:us-east-1:123456789012:thing/test-devices-device001 |
      | attributes | {"serialNumber":"S001","model":"B"} |


  Scenario: Clear existing custom device attribute
    Given device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"serialNumber":null} |
    Then device "TEST-devices-device001" exists with attributes
      | description | My description |
      | awsIotThingArn | arn:aws:iot:us-east-1:123456789012:thing/test-devices-device001 |
      | attributes |  {"model":"B"} |


  Scenario: Clear existing top level device attribute
    Given device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | awsIotThingArn | ___null___ |
    Then device "TEST-devices-device001" exists with attributes
      | description | My description |
      | awsIotThingArn | ___undefined___ |
      | attributes |  {"model":"B"} |


  Scenario: Device Ids are unique
    Given device "TEST-devices-device001" exists
    When I create device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":"A"} |
    Then it fails with a 409


  Scenario: Retrieving a device that does not exist
    Given device "TEST-devices-typeXXX" does not exist
    When I get device "TEST-devices-typeXXX"
    Then it fails with a 404


  Scenario: Should not be able to clear existing device required attributes
    Given device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | attributes | {"model":null} |
    Then it fails with a 400


  Scenario: Should not be able to delete a template when devices still exist
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" exists
    When I delete assetlibrary device template "TEST-devices-type"
    Then it fails with a 409
    And published assetlibrary device template "TEST-devices-type" exists


  Scenario: Delete the device
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" exists
    When I delete device "TEST-devices-device001"
    And I delete device "TEST-devices-device003"
    Then device "TEST-devices-device001" does not exist
    And device "TEST-devices-device003" does not exist


  Scenario: Should be able to delete a template when no devices exist
    Given published assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" does not exist
    And device "TEST-devices-device003" does not exist
    When I delete assetlibrary device template "TEST-devices-type"
    Then published assetlibrary device template "TEST-devices-type" does not exist


  @teardown_devices_feature
  Scenario: Teardown
    Given draft assetlibrary device template "TEST-devices-type" does not exist
    And published assetlibrary device template "TEST-devices-type" does not exist
    And draft assetlibrary group template "TEST-devices-linkableGroup" does not exist
    And published assetlibrary group template "TEST-devices-linkableGroup" does not exist
    And draft assetlibrary group template "TEST-devices-unlinkableGroup" does not exist
    And published assetlibrary group template "TEST-devices-unlinkableGroup" does not exist
