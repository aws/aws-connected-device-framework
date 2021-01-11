Feature: Subscriptions against an IoTCore event source

  @setup_iotCoreEventSourceFeature
  Scenario: Setup
    Given eventsource "TEST-iotcore" does not exist

  Scenario: Create a new IoT Core event source
    Given eventsource "TEST-IoTCore" does not exist
    When I create an eventsource with attributes
      | sourceType | IoTCore |
      | name | TEST-IoTCore |
      | principal | thingName |
      | iotCore | {"mqttTopic": "test/iotcore", "attributes": {"batteryLevel": "bl"}} |
    Then last eventsource exists with attributes
      | sourceType | IoTCore |
      | name | TEST-IoTCore |
      | principal | thingName |
      | iotCore.mqttTopic | test/iotcore |
      | iotCore.attributes.batteryLevel | bl |

  Scenario: Create a new event with parameterized rule allowing all targets
    Given I am using eventsource "TEST-IoTCore"
    And event "TEST-IoTCore-event" does not exist
    When I create an event with attributes
      | name | TEST-IoTCore-event |
      | conditions | {"all": [{"fact": "batteryLevel","operator": "lessThanInclusive","value": "$batteryLevel"}]} |
      | supportedTargets | {"email": "default","sms": "small","push_gcm":"small","push_apns":"small","push_ads":"default"} |
      | templates | {"default": "The battery for bowl {{=it.principalValue}} is low (at {{=it.batteryLevel}}%).","small": "{{=it.principalValue}} battery low"} |
    Then last event exists with attributes
      | name | TEST-IoTCore-event |
      | conditions.all[0].fact | batteryLevel |
      | conditions.all[0].operator | lessThanInclusive |
      | conditions.all[0].value | $batteryLevel |
      | supportedTargets.email | default |
      | supportedTargets.sms | small |
      | supportedTargets.push_gcm | small |
      | supportedTargets.push_apns | small |
      | supportedTargets.push_ads | default |
      | templates.default | The battery for bowl {{=it.principalValue}} is low (at {{=it.batteryLevel}}%). |
      | templates.small | {{=it.principalValue}} battery low |
      | ruleParameters[0] | batteryLevel |
      | enabled | true |
      | principal | thingName |
      | templateProperties[0] | principalValue |
      | templateProperties[1] | batteryLevel |

  ##### Note: following commented out as the environment needs a real GCM platformApplicationArn to test with:
  # Scenario: Create a new subscription with email and push_gcm targets
  #   Given I am using eventsource "TEST-IoTCore"
  #   And I am using event "TEST-IoTCore-event"
  #   When I create a subscription with attributes
  #     | user | { "id": "U001" } |
  #     | principalValue | vin001 |
  #     | targets | {"email": [{"address": "someone@somewhere.com"}], "push_gcm": [{"platformApplicationArn":"%property:aws.sns.push_gcm.platformApplicationArn%", "token":"6666666666"}]} |
	#     | ruleParameterValues | { "batteryLevel": 15 } |
  #   Then last subscription exists with attributes
  #     | targets.email[0].address | someone@somewhere.com |
  #     | targets.email[0].subscriptionArn | Pending confirmation |
  #     | targets.push_gcm[0].platformApplicationArn | %property:aws.sns.push_gcm.platformApplicationArn% |
  #     | targets.push_gcm[0].token | 6666666666 |
  #     | targets.push_gcm[0].platformEndpointArn | ___arn___ |
  #     | targets.push_gcm[0].subscriptionArn | ___arn___ |
  #     | id | ___uuid___ |
  #     | user.id | U001 |
  #     | principalValue | vin001 |
	#     | ruleParameterValues.batteryLevel | 15 |
  #     | enabled | true |
  #     | alerted | ___undefined___ |

  ##### Note: variation of the above commented out test but without push_gcm
  Scenario: Create a new subscription with email target
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    When I create a subscription with attributes
      | user | { "id": "U001" } |
      | principalValue | vin001 |
      | targets | {"email": [{"address": "someone@somewhere.com"}]} |
	    | ruleParameterValues | { "batteryLevel": 15 } |
    Then last subscription exists with attributes
      | targets.email[0].address | someone@somewhere.com |
      | targets.email[0].subscriptionArn | Pending confirmation |
      | id | ___uuid___ |
      | user.id | U001 |
      | principalValue | vin001 |
	    | ruleParameterValues.batteryLevel | 15 |
      | enabled | true |
      | alerted | ___undefined___ |

  Scenario: Receiving an event for a different principal does not alert
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I send the following iotcore message
      | topic | test/iotcore |
      | payload | { "thingName": "not_my_device", "bl": 1  } |
    Then last subscription has not been alerted

  Scenario: Receiving an event for principal above threshold does not alert
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I send the following iotcore message
      | topic | test/iotcore |
      | payload | { "thingName": "vin001", "bl": 50  } |
    Then last subscription has not been alerted

  Scenario: Receiving an event for principal below threshold does alert
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I send the following iotcore message
      | topic | test/iotcore |
      | payload | { "thingName": "vin001", "bl": 5  } |
    Then last subscription has been alerted

  Scenario: Adding another email target to existing subscription cannot be done via a subscription update
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I update subscription with attributes
      | targets | {"email": [{"address": "someone@somewhere.com"}, {"address": "someoneelse@somewhere.com"}]} |
    Then it fails with a 400

  Scenario: Add a second email target
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I add "email" target with attributes
      | address | someoneelse@somewhere.com |
    Then last subscription exists with attributes
      | targets.email[0].address | someone@somewhere.com |
      | targets.email[0].subscriptionArn | Pending confirmation |
      | targets.email[1].address | someoneelse@somewhere.com |
      | targets.email[1].subscriptionArn | Pending confirmation |
      | id | ___uuid___ |
      | user.id | U001 |
      | principalValue | vin001 |
	    | ruleParameterValues.batteryLevel | 15 |
      | enabled | true |

  Scenario: Remove email target
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I remove "email" target with endpoint "someoneelse@somewhere.com"
    Then last subscription exists with attributes
      | targets.email[0].address | someone@somewhere.com |
      | targets.email[0].subscriptionArn | Pending confirmation |
      | id | ___uuid___ |
      | user.id | U001 |
      | principalValue | vin001 |
	    | ruleParameterValues.batteryLevel | 15 |
      | enabled | true |

  Scenario: Add a sms target
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I add "sms" target with attributes
      | phoneNumber | 5555555555 |
    Then last subscription exists with attributes
      | targets.email[0].address | someone@somewhere.com |
      | targets.email[0].subscriptionArn | Pending confirmation |
      | targets.sms[0].phoneNumber | 5555555555 |
      | targets.sms[0].subscriptionArn | ___arn___ |
      | id | ___uuid___ |
      | user.id | U001 |
      | principalValue | vin001 |
	    | ruleParameterValues.batteryLevel | 15 |
      | enabled | true |

  Scenario: Remove sms target
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I remove "sms" target with endpoint "5555555555"
    Then last subscription exists with attributes
      | targets.email[0].address | someone@somewhere.com |
      | targets.email[0].subscriptionArn | Pending confirmation |
      | id | ___uuid___ |
      | user.id | U001 |
      | principalValue | vin001 |
	    | ruleParameterValues.batteryLevel | 15 |
      | enabled | true |

  ##### Note: following commented out as the environment needs a real GCM platformApplicationArn to test with:
  # Scenario: Add second push (gcm) target
  #   Given I am using eventsource "TEST-IoTCore"
  #   And I am using event "TEST-IoTCore-event"
  #   And I am using subscription for principal "vin001" user "U001"
  #   When I add "push_gcm" target with attributes
  #     | platformApplicationArn | %property:aws.sns.push_gcm.platformApplicationArn% |
  #     | token | 7777777777 |
  #   Then last subscription exists with attributes
  #     | targets.email[0].address | someone@somewhere.com |
  #     | targets.email[0].subscriptionArn | Pending confirmation |
  #     | targets.push_gcm[0].platformApplicationArn | %property:aws.sns.push_gcm.platformApplicationArn% |
  #     | targets.push_gcm[0].token | 6666666666 |
  #     | targets.push_gcm[0].platformEndpointArn | ___arn___ |
  #     | targets.push_gcm[0].subscriptionArn | ___arn___ |
  #     | targets.push_gcm[1].platformApplicationArn | %property:aws.sns.push_gcm.platformApplicationArn% |
  #     | targets.push_gcm[1].token | 7777777777 |
  #     | targets.push_gcm[1].platformEndpointArn | ___arn___ |
  #     | targets.push_gcm[1].subscriptionArn | ___arn___ |
  #     | id | ___uuid___ |
  #     | user.id | U001 |
  #     | principalValue | vin001 |
	#     | ruleParameterValues.batteryLevel | 15 |
  #     | enabled | true |

  ##### Note: following commented out as the environment needs a real GCM platformApplicationArn to test with:
  # Scenario: Remove push (gcm) target
  #   Given I am using eventsource "TEST-IoTCore"
  #   And I am using event "TEST-IoTCore-event"
  #   And I am using subscription for principal "vin001" user "U001"
  #   When I remove "push_gcm" target with "token" "6666666666"
  #   Then last subscription exists with attributes
  #     | targets.email[0].address | someone@somewhere.com |
  #     | targets.email[0].subscriptionArn | Pending confirmation |
  #     | targets.push_gcm[0].platformApplicationArn | %property:aws.sns.push_gcm.platformApplicationArn% |
  #     | targets.push_gcm[0].token | 7777777777 |
  #     | targets.push_gcm[0].platformEndpointArn | ___arn___ |
  #     | targets.push_gcm[0].subscriptionArn | ___arn___ |
  #     | id | ___uuid___ |
  #     | user.id | U001 |
  #     | principalValue | vin001 |
	#     | ruleParameterValues.batteryLevel | 15 |
  #     | enabled | true |

  ##### Note: following commented out as the environment needs a real GCM platformApplicationArn to test with:
  # Scenario: Update event to disallow a specific target type (push_ads)
  #   Given I am using eventsource "TEST-IoTCore"
  #   And I am using event "TEST-IoTCore-event"
  #   When I update event with attributes
  #     | supportedTargets | {"email": "default","sms": "small","push_gcm":"small","push_apns":"small"} |
  #   Then last event exists with attributes
  #     | name | TEST-IoTCore-event |
  #     | conditions.all[0].fact | batteryLevel |
  #     | conditions.all[0].operator | lessThanInclusive |
  #     | conditions.all[0].value | $batteryLevel |
  #     | supportedTargets.email | default |
  #     | supportedTargets.sms | small |
  #     | supportedTargets.push_gcm | small |
  #     | supportedTargets.push_apns | small |
  #     | supportedTargets.push_ads | ___undefined___ |
  #     | templates.default | The battery for bowl {{=it.principalValue}} is low (at {{=it.batteryLevel}}%). |
  #     | templates.small | {{=it.principalValue}} battery low |
  #     | ruleParameters[0] | batteryLevel |
  #     | enabled | true |
  #     | principal | thingName |
  #     | templateProperties[0] | principalValue |
  #     | templateProperties[1] | batteryLevel |

  Scenario: Adding an unsupported target type for the event should fail
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And I am using subscription for principal "vin001" user "U001"
    When I add "push_ads" target with attributes
      | platformApplicationArn | 6666666666 |
      | token | 6666666666 |
    Then it fails with a 400

  Scenario: Delete the event
    Given I am using eventsource "TEST-IoTCore"
    And I am using event "TEST-IoTCore-event"
    And event "TEST-IoTCore-event" exists
    When I delete event
    Then event "TEST-IoTCore-event" does not exist
    And no subscriptions exist for event "TEST-IoTCore-event"

  Scenario: Delete the event source
    Given I am using eventsource "TEST-IoTCore"
    When I delete eventsource
    Then eventsource "TEST-IoTCore" does not exist

  @teardown_iotCoreEventSourceFeature
  Scenario: Teardown
    Given eventsource "TEST-IotCore" does not exist
