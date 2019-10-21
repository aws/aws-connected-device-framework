Feature: Device History

  @setup_deviceHistory_feature
  Scenario: Setup
    Given published assetlibrary device template "TEST-deviceHistory-device-type" exists


  Scenario:  Creating a new device logs a create event
    Given device "TEST-deviceHistory-device001" does not exist
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I create device "TEST-deviceHistory-device001" with attributes
      | templateId | TEST-deviceHistory-device-type |
      | description | Description 1 |
      | attributes | {"firmwareVersion":"1"} |
      | groups | {"linked_to":["/TEST-deviceHistory-group"]} |
    And pause for 500ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | create |
      | state | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |


  Scenario:  Modifying a device logs a modify event
    Given device "TEST-deviceHistory-device001" exists
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I update device "TEST-deviceHistory-device001" with attributes
      | attributes | {"firmwareVersion":"2"} |
    And pause for 500ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | modify |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","devices":{},"groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |


  Scenario:  Deleting a device logs a delete event
    Given device "TEST-deviceHistory-device001" exists
    # We store the time the test started so that we can filter out history records that may have been saved for this device prior to the test:
    And I store the time the test started
    When I delete device "TEST-deviceHistory-device001"
    And pause for 500ms
    Then 1 history records exist since the test started for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | delete |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |


  Scenario:  Retrieve all events relating to this test
    When I retrieve 3 history records for device "TEST-deviceHistory-device001"
    Then history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | delete |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |
    And history record 2 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | modify |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |
    And history record 3 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | create |
      | state | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |


  Scenario:  Paginate all events relating to this test
    When I retrieve 1 history records for device "TEST-deviceHistory-device001"
    Then history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | delete |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |
    When I retrieve next 1 history records for device "TEST-deviceHistory-device001"
    Then history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | modify |
      | state | {"attributes":{"firmwareVersion":"2"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |
    When I retrieve next 1 history records for device "TEST-deviceHistory-device001"
    And history record 1 contains attributes
      | objectId | test-devicehistory-device001 |
      | event | create |
      | state | {"attributes":{"firmwareVersion":"1"},"category":"device","description":"Description 1","deviceId":"test-devicehistory-device001","groups":{"out":{"linked_to":["/test-devicehistory-group"]}},"state":"unprovisioned","templateId":"test-devicehistory-device-type"} |
      | type | devices |
  

  @teardown_deviceHistory_feature
  Scenario: Teardown
    Given published assetlibrary device template "TEST-deviceHistory-device-type" does not exist
