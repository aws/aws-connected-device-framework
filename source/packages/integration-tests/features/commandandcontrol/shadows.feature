Feature: Command & Control - Shadows

  @setup_commandandcontrol_shadows
  Scenario: Setup
    When I pause for 5000ms
    Then command-and-control command with operation "cdf-integration-test-stats" does not exist

  Scenario: Create a command
    Given command-and-control command with operation "cdf-integration-test-stats" does not exist
    When I create command-and-control command with attributes:
      | operation | cdf-integration-test-stats |
      | deliveryMethod | { "type": "SHADOW", "expectReply": true } |
      | payloadTemplate | "{\"level\": \"${level}\"}" |
      | payloadParams | ["level"] |
      | tags | {"cdf-integration-test": true} |
    Then last command-and-control command exists with attributes:
      | $.id | ___regex___:^[a-z0-9]{9}$ |
      | $.operation | cdf-integration-test-stats |
      | $.deliveryMethod.type | SHADOW |
      | $.deliveryMethod.expectReply | true |
      | $.payloadTemplate | "{\"level\": \"${level}\"}" |
      | $.payloadParams.length | 1 |
      | $.payloadParams.[0] | level |
      | $.tags.cdf-integration-test | true |
      | $.createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Send a message to a thing group
    Given command-and-control command with operation "cdf-integration-test-stats" exists
    When I send command-and-control message to last command with attributes:
      | targets |{"awsIoT": {"thingGroupNames": ["cdf-integration-test-cac-shadows-group1"]}} |
      | payloadParamValues | {"level": "high"} |
    And I wait until last command-and-control message has "awaiting_replies" status
    Then last command-and-control message exists with attributes:
      | $.id | ___world___:lastMessageId |
      | $.commandId | ___world___:lastCommand.id |
      | $.targets.awsIoT.thingGroupNames.length | 1 |
      | $.targets.awsIoT.thingGroupNames.[0] | cdf-integration-test-cac-shadows-group1 |
      | $.status | awaiting_replies |
      | $.createdAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    When I pause for 3000ms
    Then last command-and-control message has recipients:
      | $.recipients.length | 2 |
      | $.recipients.[0].thingName | cdf-integration-test-cac-shadows-device1 |
      | $.recipients.[0].status | success |
      | $.recipients.[0].correlationId | ___regex___:^[a-z0-9]{9}$ |
      | $.recipients.[1].thingName | cdf-integration-test-cac-shadows-device2 |
      | $.recipients.[1].status | success |
      | $.recipients.[1].correlationId | ___regex___:^[a-z0-9]{9}$ |

  Scenario: A recipient replies to a message
    When thing "cdf-integration-test-cac-shadows-device1" replies to last command-and-control message as "accepted"
    And thing "cdf-integration-test-cac-shadows-device1" replies to last command-and-control message with payload:
      | response | first |
    And thing "cdf-integration-test-cac-shadows-device1" replies to last command-and-control message with payload:
      | response | second |
    When I pause for 3000ms
    Then last command-and-control message has replies from "cdf-integration-test-cac-shadows-device1":
      | $.replies.length | 3 |
      | $.replies.[0].receivedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[0].action  | accepted |
      | $.replies.[0].payload  | ___undefined___ |
      | $.replies.[1].receivedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[1].action  | reply |
      | $.replies.[1].payload  | {"response":"first"} |
      | $.replies.[2].receivedAt  | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[2].action  | reply |
      | $.replies.[2].payload  | {"response":"second"} |


  @teardown_commandandcontrol_shadows
  Scenario: Teardown
    When I pause for 5000ms
    Then command-and-control command with operation "cdf-integration-test-stats" does not exist
    