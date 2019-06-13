Feature: Provisioning Things

  @setup_thing_provisioning
  Scenario: Setup
    Given thing "%property:thing.arn%" does not exist

  Scenario: Provision a Thing
    Given thing "%property:thing.arn%" does not exist
    When I provision a thing "%property:thing.arn%"
    Then the thing "%property:thing.arn%" is provisioned

  @teardown_thing_provisioning
  Scenario: Teardown
    Given thing "%property:thing.arn%" does not exist
