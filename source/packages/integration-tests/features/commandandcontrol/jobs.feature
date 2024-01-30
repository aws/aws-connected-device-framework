Feature: Command & Control - Jobs

  @setup_commandandcontrol_jobs
  Scenario: Setup
    When I pause for 5000ms
    Then command-and-control command with operation "cdf-integration-test-ota" does not exist
    Then command-and-control command with operation "cdf-integration-test-ota-named" does not exist
    And thing "cdf-integration-test-cac-jobs-device1" exists
    And thing "cdf-integration-test-cac-jobs-device2" exists

  Scenario: Create a command
    Given command-and-control command with operation "cdf-integration-test-ota" does not exist
    When I create command-and-control command with attributes:
      | operation       | cdf-integration-test-ota                                                                                                                                                                                                                                                                                                                                                                                                                                         |
      | deliveryMethod  | {"type": "JOB",  "targetSelection": "SNAPSHOT" , "expectReply": true,"presignedUrlConfig": {"expiresInSec": 3600},"jobExecutionsRolloutConfig": {"maximumPerMinute": 50,"exponentialRate":{"baseRatePerMinute":20,"incrementFactor": 2,"rateIncreaseCriteria": {"numberOfNotifiedThings": 1000}}},"abortConfig": {"criteriaList": [{"action": "CANCEL","failureType": "FAILED","minNumberOfExecutedThings": 100,"thresholdPercentage": 20}]},"timeoutConfig": {"inProgressTimeoutInMinutes": 100}} |
      | payloadTemplate | "{\"firmwareLocation\": \"${aws:iot:s3-presigned-url:${s3Url}}\"}"                                                                                                                                                                                                                                                                                                                                                                                               |
      | payloadParams   | ["s3Url"]                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
      | tags            | {"cdf-integration-test": true}                                                                                                                                                                                                                                                                                                                                                                                                                                   |
    Then last command-and-control command exists with attributes:
      | $.id                                                                                                    | ___regex___:^[a-z0-9]{9}$                                              |
      | $.operation                                                                                             | cdf-integration-test-ota                                               |
      | $.deliveryMethod.type                                                                                   | JOB                                                                    |
      | $.deliveryMethod.expectReply                                                                            | true                                                                   |
      | $.deliveryMethod.targetSelection                                                                        | SNAPSHOT                                                               |
      | $.deliveryMethod.presignedUrlConfig.expiresInSec                                                        | 3600                                                                   |
      | $.deliveryMethod.jobExecutionsRolloutConfig.maximumPerMinute                                            | 50                                                                     |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.baseRatePerMinute                           | 20                                                                     |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.incrementFactor                             | 2                                                                      |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.rateIncreaseCriteria.numberOfNotifiedThings | 1000                                                                   |
      | $.deliveryMethod.abortConfig.criteriaList.length                                                        | 1                                                                      |
      | $.deliveryMethod.abortConfig.criteriaList.[0].action                                                    | CANCEL                                                                 |
      | $.deliveryMethod.abortConfig.criteriaList.[0].failureType                                               | FAILED                                                                 |
      | $.deliveryMethod.abortConfig.criteriaList.[0].minNumberOfExecutedThings                                 | 100                                                                    |
      | $.deliveryMethod.abortConfig.criteriaList.[0].thresholdPercentage                                       | 20                                                                     |
      | $.deliveryMethod.timeoutConfig.inProgressTimeoutInMinutes                                               | 100                                                                    |
      | $.payloadTemplate                                                                                       | "{\"firmwareLocation\": \"${aws:iot:s3-presigned-url:${s3Url}}\"}"     |
      | $.payloadParams.length                                                                                  | 1                                                                      |
      | $.payloadParams.[0]                                                                                     | s3Url                                                                  |
      | $.tags.cdf-integration-test                                                                             | true                                                                   |
      | $.createdAt                                                                                             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                                                                                             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

  Scenario: Create a named command
    Given command-and-control command with operation "cdf-integration-test-ota-named" does not exist
    When I create named command-and-control command with attributes:
      | operation       | cdf-integration-test-ota-named                                                                                                                                                                                                                                                                                                                                                                                                                                   |
      | deliveryMethod  | {"type": "JOB",  "targetSelection": "SNAPSHOT" , "expectReply": true,"presignedUrlConfig": {"expiresInSec": 3600},"jobExecutionsRolloutConfig": {"maximumPerMinute": 50,"exponentialRate":{"baseRatePerMinute":20,"incrementFactor": 2,"rateIncreaseCriteria": {"numberOfNotifiedThings": 1000}}},"abortConfig": {"criteriaList": [{"action": "CANCEL","failureType": "FAILED","minNumberOfExecutedThings": 100,"thresholdPercentage": 20}]},"timeoutConfig": {"inProgressTimeoutInMinutes": 100}} |
      | payloadTemplate | "{\"firmwareLocation\": \"${aws:iot:s3-presigned-url:${s3Url}}\"}"                                                                                                                                                                                                                                                                                                                                                                                               |
      | payloadParams   | ["s3Url"]                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
      | tags            | {"cdf-integration-test": true}                                                                                                                                                                                                                                                                                                                                                                                                                                   |
    Then last command-and-control command exists with attributes:
      | $.id                                                                                                    | test_name                                              |
      | $.operation                                                                                             | cdf-integration-test-ota-named                                               |
      | $.deliveryMethod.type                                                                                   | JOB                                                                    |
      | $.deliveryMethod.expectReply                                                                            | true                                                                   |
      | $.deliveryMethod.targetSelection                                                                        | SNAPSHOT                                                               |
      | $.deliveryMethod.presignedUrlConfig.expiresInSec                                                        | 3600                                                                   |
      | $.deliveryMethod.jobExecutionsRolloutConfig.maximumPerMinute                                            | 50                                                                     |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.baseRatePerMinute                           | 20                                                                     |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.incrementFactor                             | 2                                                                      |
      | $.deliveryMethod.jobExecutionsRolloutConfig.exponentialRate.rateIncreaseCriteria.numberOfNotifiedThings | 1000                                                                   |
      | $.deliveryMethod.abortConfig.criteriaList.length                                                        | 1                                                                      |
      | $.deliveryMethod.abortConfig.criteriaList.[0].action                                                    | CANCEL                                                                 |
      | $.deliveryMethod.abortConfig.criteriaList.[0].failureType                                               | FAILED                                                                 |
      | $.deliveryMethod.abortConfig.criteriaList.[0].minNumberOfExecutedThings                                 | 100                                                                    |
      | $.deliveryMethod.abortConfig.criteriaList.[0].thresholdPercentage                                       | 20                                                                     |
      | $.deliveryMethod.timeoutConfig.inProgressTimeoutInMinutes                                               | 100                                                                    |
      | $.payloadTemplate                                                                                       | "{\"firmwareLocation\": \"${aws:iot:s3-presigned-url:${s3Url}}\"}"     |
      | $.payloadParams.length                                                                                  | 1                                                                      |
      | $.payloadParams.[0]                                                                                     | s3Url                                                                  |
      | $.tags.cdf-integration-test                                                                             | true                                                                   |
      | $.createdAt                                                                                             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                                                                                             | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |

    
  Scenario: Send a message to a thing group
    Given command-and-control command with operation "cdf-integration-test-ota" exists
    When I send command-and-control message to last command with attributes:
      | targets | {"awsIoT": {"thingGroups": [{"name":"cdf-integration-test-cac-jobs-group1", "expand":true}]}} |
      | payloadParamValues | {"s3Url":"%property:GREENGRASS_TEMPLATE_S3_LOCATION%"} |
    And I wait until last command-and-control message has "awaiting_replies" status
    Then last command-and-control message exists with attributes:
      | $.id                                  | ___world___:lastMessageId                                              |
      | $.commandId                           | ___world___:lastCommand.id                                             |
      | $.targets.awsIoT.thingGroups.length   | 1                                                                      |
      | $.targets.awsIoT.thingGroups.[0].name | cdf-integration-test-cac-jobs-group1                                   |
      | $.status                              | awaiting_replies                                                       |
      | $.createdAt                           | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.updatedAt                           | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
    # TODO: Discover why this message has a 30second delay, which necessitates this 30sec pause
    # https://github.com/aws/aws-connected-device-framework/blob/main/source/packages/services/command-and-control/src/messages/workflow/workflow.createEphemeralGroup.ts#L190
    When I pause for 30000ms
    Then last command-and-control message has recipients:
      | $.recipients.length            | 2                                     |
      | $.recipients.[0].id            | cdf-integration-test-cac-jobs-device1 |
      | $.recipients.[0].status        | success                               |
      | $.recipients.[0].correlationId | ___regex___:^[a-z0-9]{9}$             |
      | $.recipients.[1].id            | cdf-integration-test-cac-jobs-device2 |
      | $.recipients.[1].status        | success                               |
      | $.recipients.[1].correlationId | ___regex___:^[a-z0-9]{9}$             |

  Scenario: A recipient replies to a message
    When thing "cdf-integration-test-cac-jobs-device1" replies to last command-and-control message as "IN_PROGRESS"
    When I pause for 3000ms
    Then last command-and-control message has replies from "cdf-integration-test-cac-jobs-device1":
      | $.replies.length         | 1                                                                      |
      | $.replies.[0].receivedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[0].action     | accepted                                                               |
      | $.replies.[0].payload    | ___undefined___                                                        |
    When thing "cdf-integration-test-cac-jobs-device1" replies to last command-and-control message with payload:
      | response | first |
    Then last command-and-control message has replies from "cdf-integration-test-cac-jobs-device1":
      | $.replies.length         | 1                                                                      |
      | $.replies.[0].receivedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[0].action     | accepted                                                               |
      | $.replies.[0].payload    | {"response": "first"}                                                  |
    When thing "cdf-integration-test-cac-jobs-device1" replies to last command-and-control message as "SUCCEEDED" with payload:
      | response | second |
    Then last command-and-control message has replies from "cdf-integration-test-cac-jobs-device1":
      | $.replies.length         | 1                                                                      |
      | $.replies.[0].receivedAt | ___regex___:^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}).(\d{3})Z$ |
      | $.replies.[0].action     | reply                                                                  |
      | $.replies.[0].payload    | {"response": "second"}                                                 |

  @teardown_commandandcontrol_jobs
  Scenario: Teardown
