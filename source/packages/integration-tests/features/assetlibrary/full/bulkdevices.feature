Feature: Bulk Device Operations

  @setup_bulkdevices_feature
  Scenario: Setup
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-bulkdevices-type" exists

  Scenario: Bulk Create Devices
    Given my authorization is
      | / | * |
    And published assetlibrary device template "TEST-bulkdevices-type" exists
    And device "TEST-bulkdevices-device001" does not exist
    And device "TEST-bulkdevices-device002" does not exist
    And device "TEST-bulkdevices-device003" does not exist
    When I bulk create the following devices
      | deviceId                   | templateId            | description        | thingArn                                                            | attributes                                        | groups                         |
      | TEST-bulkdevices-device001 | TEST-bulkdevices-type | Test Bulk Device 1 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device001 | {"stringAttribute":"string1","numberAttribute":1} | {"member_of":["/bulkdevices"]} |
      | TEST-bulkdevices-device002 | TEST-bulkdevices-type | Test Bulk Device 2 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device002 | {"stringAttribute":"string2","numberAttribute":2} | {"member_of":["/bulkdevices"]} |
      | TEST-bulkdevices-device003 | TEST-bulkdevices-type | Test Bulk Device 3 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device003 | {"stringAttribute":"string3","numberAttribute":3} | {"member_of":["/bulkdevices"]} |
    Then a bulk get of "TEST-bulkdevices-device001,TEST-bulkdevices-device002,TEST-bulkdevices-device003" returns the following devices
      | deviceId                   | templateId            | description        | thingArn                                                            | attributes                                        | groups                         |
      | TEST-bulkdevices-device001 | TEST-bulkdevices-type | Test Bulk Device 1 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device001 | {"stringAttribute":"string1","numberAttribute":1} | {"member_of":["/bulkdevices"]} |
      | TEST-bulkdevices-device002 | TEST-bulkdevices-type | Test Bulk Device 2 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device002 | {"stringAttribute":"string2","numberAttribute":2} | {"member_of":["/bulkdevices"]} |
      | TEST-bulkdevices-device003 | TEST-bulkdevices-type | Test Bulk Device 3 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device003 | {"stringAttribute":"string3","numberAttribute":3} | {"member_of":["/bulkdevices"]} |

  Scenario: Bulk Get Devices Mix of Existing and Non-Existing Devices
    Given my authorization is
      | / | * |
    And device "TEST-bulkdevices-device001" exists
    And device "TEST-bulkdevices-device999" does not exist
    Then a bulk get of "TEST-bulkdevices-device001,TEST-bulkdevices-device999" returns the following devices
      | deviceId                   | templateId            | description        | thingArn                                                            | attributes                                        | groups                         |
      | TEST-bulkdevices-device001 | TEST-bulkdevices-type | Test Bulk Device 1 | arn:aws:iot:us-east-1:123456789012:thing/test-bulkdevices-device001 | {"stringAttribute":"string1","numberAttribute":1} | {"member_of":["/bulkdevices"]} |

  Scenario: Bulk Get Non-Existing Devices
    Given my authorization is
      | / | * |
    And device "TEST-bulkdevices-device888" does not exist
    And device "TEST-bulkdevices-device999" does not exist
    Then a bulk get of "TEST-bulkdevices-device888,TEST-bulkdevices-device999" returns the following devices
      | deviceId | templateId | description | thingArn | attributes | groups |

  @teardown_bulkdevices_feature
  Scenario: Teardown
    Given my authorization is
      | / | * |
    And draft assetlibrary device template "TEST-bulkdevices-type" does not exist
    And published assetlibrary device template "TEST-bulkdevices-type" does not exist
