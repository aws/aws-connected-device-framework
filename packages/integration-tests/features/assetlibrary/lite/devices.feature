Feature: Device lifecycle

  @setup_devices_feature_lite
  Scenario: Setup
    Given group "TEST-devices-group001" exists

  Scenario: Create a new Device Template with required fields not supported
    Given assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string"]}} |
      | required | ["serialNumber"] |
    Then it fails with a 400

  Scenario: Create a new Device Template with defined relations not supported
    Given assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string"]}} |
      | relations | {"out":{"linked_to":["test-devices-linkablegroup"]}} |
    Then it fails with a 400

  Scenario: Create a new Device Template with non string types not supported
    Given assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["number"]}} |
    Then it fails with a 400

  Scenario: Create a new Device Template with >3 attributes not allowed
    Given assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"field1":{"type":["string"]},"field2":{"type":["string"]},"field3":{"type":["string"]},"field4":{"type":["string"]}} |
    Then it fails with a 400

  Scenario: Create a new Device Template 
    Given assetlibrary device template "TEST-devices-type" does not exist
    When I create the assetlibrary device template "TEST-devices-type" with attributes
      | properties | {"serialNumber":{"type":["string"]}} |
    Then assetlibrary device template "TEST-devices-type" exists with attributes
      | properties | {"serialNumber":{"type":["string"]}} |

  Scenario: Create a Device of a device type
    Given assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" does not exist
    When I create device "TEST-devices-device001" with attributes
      | templateId | TEST-devices-type |
      | description | abc |
      | attributes | {"serialNumber":"S001","model":"A"} |
    Then device "TEST-devices-device001" exists with attributes
      | templateId | TEST-devices-type |
      | description | abc |
      | attributes | {"serialNumber":"S001","model":"A"} |

  Scenario: Update existing device attributes
    Given device "TEST-devices-device001" exists
    When I update device "TEST-devices-device001" with attributes
      | attributes | {"model":"B"} |
    Then device "TEST-devices-device001" exists with attributes
      | description | abc |
      | awsIotThingArn | arn:aws:iot:%property:aws.region%:%property:aws.accountid%:thing/TEST-devices-device001 |
      | attributes | {"serialNumber":"S001","model":"B"} |

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


  Scenario: Delete the device
    Given assetlibrary device template "TEST-devices-type" exists
    And device "TEST-devices-device001" exists
    When I delete device "TEST-devices-device001"
    And I delete device "TEST-devices-device002"
    Then device "TEST-devices-device001" does not exist
    And device "TEST-devices-device002" does not exist


  Scenario: Should be able to delete (deprecate) a template
    Given assetlibrary device template "TEST-devices-type" exists
    When I delete assetlibrary device template "TEST-devices-type"
    Then assetlibrary device template "TEST-devices-type" exists with attributes
      | status | deprecated |
  

  @teardown_devices_feature_lite
  Scenario: Teardown
    Given assetlibrary device template "TEST-devices-type" exists with attributes
      | status | deprecated |
